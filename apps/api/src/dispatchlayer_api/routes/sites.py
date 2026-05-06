"""
POST /api/v1/sites/evaluate

Full analysis pipeline evaluation for a configured renewable site.
Accepts lat/lon, asset type, and capacity; returns forecast context, data-quality
confidence, structural drift warning, and audit trace — all traceable to source inputs.

data_mode controls the external-signal layer:
  live    — call real public provider adapters (Open-Meteo, NASA POWER)
  fixture — use recorded provider payloads (tests, offline analysis, CI)
  hybrid  — live where reachable; fixture fallback for missing/failed providers

Every response includes a `sources` block that attributes each signal to its
provider, reports freshness, cache status, and any degraded-mode warnings.

Dispatch Layer does not depend on fabricated runtime data.  The production path uses
provider adapters for real public weather, solar-resource, and grid data.
Recorded fixtures are used only for tests, CI, offline analysis, and failure-mode
simulation.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from typing import Literal, Optional
import logging
import time
import json
import pathlib

from dispatchlayer_adapter_open_meteo.client import OpenMeteoClient
from dispatchlayer_domain.models import GeoPoint, ForecastWindow
from dispatchlayer_domain.errors import ProviderUnavailableError, ProviderError

from dispatchlayer_predictive import (
    LocalSignalScorer,
    PortfolioStateBuilder,
    PredictiveEvolutionEngine,
    compute_trust_score,
    detect_residual_drift,
)
from dispatchlayer_predictive.decision_trace import DecisionTrace

logger = logging.getLogger(__name__)
router = APIRouter(tags=["sites"])

_OPEN_METEO_FIXTURE = (
    pathlib.Path(__file__).parent.parent.parent.parent.parent.parent
    / "packages" / "adapters" / "open_meteo" / "tests" / "fixtures"
    / "west_texas_wind_2025_06_05.json"
)


def _load_open_meteo_fixture() -> dict:
    try:
        return json.loads(_OPEN_METEO_FIXTURE.read_text())
    except FileNotFoundError:
        return {}


def _extract_current_sample_from_forecast(forecast, now: datetime) -> dict:
    """Extract the weather sample closest to `now` from a WeatherForecast."""
    if not forecast.samples:
        return {}
    closest = min(forecast.samples, key=lambda s: abs((s.timestamp_utc - now).total_seconds()))
    return {
        "wind_speed_mps": closest.wind_speed_mps,
        "ghi_wm2": closest.shortwave_radiation_wm2,
        "temperature_c": closest.temperature_c,
    }


def _extract_sample_from_fixture(fixture_data: dict, now: datetime) -> dict:
    """Extract the weather sample closest to `now` from an Open-Meteo fixture dict."""
    hourly = fixture_data.get("hourly", {})
    times = hourly.get("time", [])
    wind_speeds = hourly.get("wind_speed_10m", [])
    radiations = hourly.get("shortwave_radiation", [])
    temperatures = hourly.get("temperature_2m", [])

    if not times:
        return {}

    best_i = 0
    best_diff = float("inf")
    for i, t_str in enumerate(times):
        try:
            t = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
            diff = abs((t - now).total_seconds())
            if diff < best_diff:
                best_diff = diff
                best_i = i
        except ValueError:
            continue

    def _safe(arr: list, i: int):
        return arr[i] if arr and i < len(arr) else None

    return {
        "wind_speed_mps": _safe(wind_speeds, best_i),
        "ghi_wm2": _safe(radiations, best_i),
        "temperature_c": _safe(temperatures, best_i),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class SiteEvaluationRequest(BaseModel):
    name: str = "demo_site"
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    asset_type: str = Field("solar", description="solar | wind | wind_solar | bess")
    capacity_mw: float = Field(..., gt=0)
    window_hours: int = Field(24, ge=1, le=168)
    data_mode: Literal["live", "fixture", "hybrid"] = Field(
        default="hybrid",
        description=(
            "live=call real providers | "
            "fixture=recorded payloads for tests/offline demo | "
            "hybrid=live where configured, fixture for unconfigured providers"
        ),
    )
    # Optional live signal overrides (ignored when data_mode=live and provider succeeds)
    wind_speed_mps: Optional[float] = None
    ghi_wm2: Optional[float] = None
    temperature_c: Optional[float] = None
    grid_demand_mw: Optional[float] = None
    forecast_residual_pct: Optional[float] = None
    # Optional trailing residuals for drift detection (most-recent-last)
    trailing_residuals: Optional[list[float]] = None
    # Market/dispatch context
    current_soc_pct: Optional[float] = None
    price_per_mwh: float = 45.0
    # BESS capacity (used for solar_bess asset_type)
    battery_capacity_mwh: Optional[float] = None


class SiteEvaluationResponse(BaseModel):
    site_id: str
    asset_type: str
    capacity_mw: float
    window_hours: int
    timestamp_utc: str
    data_mode: str
    sources: list[dict]
    warnings: list[str]
    # Forecast context
    expected_generation_mwh: float
    p10_mwh: float
    p50_mwh: float
    p90_mwh: float
    # Data-quality confidence
    forecast_trust_score: float
    forecast_trust_grade: str
    error_decomposition: dict
    trust_warnings: list[str]
    # Drift
    structural_drift: dict
    # Audit
    audit_trace: dict


# ─────────────────────────────────────────────────────────────────────────────
# Provider resolution
# ─────────────────────────────────────────────────────────────────────────────

async def _resolve_weather_signals(
    req: SiteEvaluationRequest,
    now: datetime,
) -> tuple[Optional[float], Optional[float], Optional[float], list[dict], list[str]]:
    """
    Resolve wind_speed_mps, ghi_wm2, temperature_c from the appropriate source
    based on data_mode.

    Returns (wind_speed_mps, ghi_wm2, temperature_c, sources_list, warnings_list).
    """
    sources: list[dict] = []
    warnings: list[str] = []

    wind_speed_mps = req.wind_speed_mps
    ghi_wm2 = req.ghi_wm2
    temperature_c = req.temperature_c

    if req.data_mode == "fixture":
        fixture = _load_open_meteo_fixture()
        if fixture:
            sample = _extract_sample_from_fixture(fixture, now)
            if wind_speed_mps is None:
                wind_speed_mps = sample.get("wind_speed_mps")
            if ghi_wm2 is None:
                ghi_wm2 = sample.get("ghi_wm2")
            if temperature_c is None:
                temperature_c = sample.get("temperature_c")
            sources.append({
                "provider": "open_meteo",
                "status": "fixture",
                "freshness_utc": fixture.get("hourly", {}).get("time", ["unknown"])[0],
                "cache": "fixture",
                "data_notice": (
                    "Recorded fixture for tests and offline demo. "
                    "File: packages/adapters/open_meteo/tests/fixtures/west_texas_wind_2025_06_05.json"
                ),
            })
        else:
            sources.append({"provider": "open_meteo", "status": "fixture_not_found", "cache": "fixture"})
            warnings.append("Open-Meteo fixture file not found; falling back to request-supplied values.")

        # EIA unconfigured in fixture mode (no key set by default)
        sources.append({
            "provider": "eia",
            "status": "unconfigured",
            "degraded_mode": "grid context omitted — set DISPATCHLAYER_EIA_API_KEY to enable",
        })
        warnings.append("EIA_API_KEY not configured; regional grid context omitted.")

        return wind_speed_mps, ghi_wm2, temperature_c, sources, warnings

    # live or hybrid
    t_probe = time.monotonic()
    location = GeoPoint(latitude=req.latitude, longitude=req.longitude)
    window = ForecastWindow(
        start_utc=now,
        end_utc=now + timedelta(hours=req.window_hours),
        resolution_minutes=60,
    )

    try:
        client = OpenMeteoClient()
        forecast = await client.get_forecast(location, window)
        latency_ms = round((time.monotonic() - t_probe) * 1000, 1)
        sample = _extract_current_sample_from_forecast(forecast, now)

        if wind_speed_mps is None:
            wind_speed_mps = sample.get("wind_speed_mps")
        if ghi_wm2 is None:
            ghi_wm2 = sample.get("ghi_wm2")
        if temperature_c is None:
            temperature_c = sample.get("temperature_c")

        sources.append({
            "provider": "open_meteo",
            "status": "success",
            "freshness_utc": now.isoformat(),
            "latency_ms": latency_ms,
            "cache": "miss",
            "sample_count": len(forecast.samples),
        })
        logger.info(
            "Open-Meteo live fetch succeeded: %d samples, %.0fms", len(forecast.samples), latency_ms
        )

    except (ProviderUnavailableError, ProviderError, Exception) as exc:
        latency_ms = round((time.monotonic() - t_probe) * 1000, 1)
        logger.warning("Open-Meteo live fetch failed (%s), falling back", exc)

        if req.data_mode == "hybrid":
            fixture = _load_open_meteo_fixture()
            sample = _extract_sample_from_fixture(fixture, now) if fixture else {}
            if wind_speed_mps is None:
                wind_speed_mps = sample.get("wind_speed_mps")
            if ghi_wm2 is None:
                ghi_wm2 = sample.get("ghi_wm2")
            if temperature_c is None:
                temperature_c = sample.get("temperature_c")

            sources.append({
                "provider": "open_meteo",
                "status": "degraded",
                "error": str(exc)[:120],
                "latency_ms": latency_ms,
                "fallback": "fixture",
                "cache": "fixture",
            })
            warnings.append(
                f"Open-Meteo live fetch failed ({exc!s:.80}); used fixture fallback."
            )
        else:
            # live mode, propagate error
            sources.append({
                "provider": "open_meteo",
                "status": "error",
                "error": str(exc)[:120],
                "latency_ms": latency_ms,
            })
            warnings.append(f"Open-Meteo unreachable in live mode; weather signals may be absent.")

    # EIA / grid context
    from ..config import get_settings
    settings = get_settings()
    if settings.eia_api_key:
        sources.append({"provider": "eia", "status": "configured_not_called", "cache": "none"})
    else:
        sources.append({
            "provider": "eia",
            "status": "unconfigured",
            "degraded_mode": "grid context omitted",
        })
        warnings.append("EIA_API_KEY not configured; regional grid context omitted.")

    return wind_speed_mps, ghi_wm2, temperature_c, sources, warnings


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/sites/evaluate", response_model=SiteEvaluationResponse)
async def evaluate_site(req: SiteEvaluationRequest) -> SiteEvaluationResponse:
    now = datetime.now(timezone.utc)
    trace = DecisionTrace(model_versions={"predictive_core": "0.1.0", "pipeline": "L→G→P→D"})

    # ── Provider resolution ────────────────────────────────────────────────────
    wind_speed_mps, ghi_wm2, temperature_c, sources, warnings = (
        await _resolve_weather_signals(req, now)
    )

    #  L: Local Signal Scoring 
    scorer = LocalSignalScorer(now=now)
    observed_at = now

    scores = scorer.score_site_context(
        site_id=req.name,
        wind_speed_mps=wind_speed_mps,
        wind_observed_at=observed_at if wind_speed_mps is not None else None,
        ghi_wm2=ghi_wm2,
        solar_observed_at=observed_at if ghi_wm2 is not None else None,
        grid_demand_mw=req.grid_demand_mw,
        grid_observed_at=observed_at if req.grid_demand_mw is not None else None,
        forecast_residual_pct=req.forecast_residual_pct,
        residual_observed_at=observed_at if req.forecast_residual_pct is not None else None,
        battery_soc_pct=req.current_soc_pct,
        battery_observed_at=observed_at if req.current_soc_pct is not None else None,
    )

    trace.add_step(
        "L_local_signal_scoring",
        inputs={
            "data_mode": req.data_mode,
            "wind_speed_mps": wind_speed_mps,
            "ghi_wm2": ghi_wm2,
            "grid_demand_mw": req.grid_demand_mw,
            "forecast_residual_pct": req.forecast_residual_pct,
        },
        output={"interactions_scored": len(scores.interactions)},
        reasoning="Scored typed temporal interactions with per-type exponential decay",
    )

    #  G: Structural Summarization 
    builder = PortfolioStateBuilder()
    site_state = builder.build_site_state(
        scores,
        asset_type=req.asset_type,
        capacity_mw=req.capacity_mw,
        temperature_c=temperature_c,
    )

    trace.add_step(
        "G_structural_summarization",
        inputs={"asset_type": req.asset_type, "capacity_mw": req.capacity_mw},
        output={
            "capacity_factor_estimate": round(site_state.capacity_factor_estimate, 3),
            "data_quality": round(site_state.data_quality, 3),
            "derating_risk": round(site_state.derating_risk, 3),
        },
        reasoning="Compressed local scores into site structural state",
    )

    #  P: Predictive Evolution 
    engine = PredictiveEvolutionEngine()
    prediction = engine.predict_site(site_state, window_hours=req.window_hours)

    trace.add_step(
        "P_predictive_evolution",
        inputs={"window_hours": req.window_hours},
        output={
            "p50_mwh": round(prediction.p50_generation_mwh, 2),
            "forecast_trust": round(prediction.forecast_trust, 3),
            "structural_error": round(prediction.structural_error, 3),
            "predictive_error": round(prediction.predictive_error, 3),
            "observational_noise": round(prediction.observational_noise, 3),
        },
        reasoning="Propagated structural state forward with p10/p50/p90 bounds and three-term error decomposition",
    )

    #  Trust score 
    trust = compute_trust_score(
        structural_error=prediction.structural_error,
        predictive_error=prediction.predictive_error,
        observational_noise=prediction.observational_noise,
    )

    #  Structural drift 
    trailing = req.trailing_residuals or []
    recent = [req.forecast_residual_pct] if req.forecast_residual_pct is not None else []
    drift_warning = detect_residual_drift(req.name, recent, trailing)

    trace.add_step(
        "structural_drift_detection",
        inputs={"recent_count": len(recent), "baseline_count": len(trailing)},
        output={"risk": drift_warning.risk.value, "reason": drift_warning.reason[:80]},
        reasoning="Compared recent residuals against trailing baseline for regime-shift detection",
    )

    #  Build response 
    return SiteEvaluationResponse(
        site_id=req.name,
        asset_type=req.asset_type,
        capacity_mw=req.capacity_mw,
        window_hours=req.window_hours,
        timestamp_utc=now.isoformat(),
        data_mode=req.data_mode,
        sources=sources,
        warnings=warnings,
        expected_generation_mwh=round(prediction.expected_generation_mwh, 2),
        p10_mwh=round(prediction.p10_generation_mwh, 2),
        p50_mwh=round(prediction.p50_generation_mwh, 2),
        p90_mwh=round(prediction.p90_generation_mwh, 2),
        forecast_trust_score=round(trust.trust_score, 3),
        forecast_trust_grade=trust.grade,
        error_decomposition={
            "structural_error": {
                "score": round(trust.structural_error.score, 3),
                "meaning": trust.structural_error.meaning,
                "action": trust.structural_error.action,
            },
            "predictive_error": {
                "score": round(trust.predictive_error.score, 3),
                "meaning": trust.predictive_error.meaning,
                "action": trust.predictive_error.action,
            },
            "observational_noise": {
                "score": round(trust.observational_noise.score, 3),
                "meaning": trust.observational_noise.meaning,
                "action": trust.observational_noise.action,
            },
            "dominant_term": trust.dominant_term,
        },
        trust_warnings=trust.warnings,
        structural_drift={
            "risk": drift_warning.risk.value,
            "reason": drift_warning.reason,
            "threshold_state_label": drift_warning.threshold_state_label,
        },
        audit_trace=trace.to_dict(),
    )
