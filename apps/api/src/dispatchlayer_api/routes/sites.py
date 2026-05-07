# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
POST /api/v1/sites/evaluate

Full analysis pipeline evaluation for a configured renewable site.
Accepts lat/lon, asset type, and capacity; returns forecast context, data-quality
confidence, structural drift warning, and audit trace  all traceable to source inputs.

This endpoint runs in live-provider mode and calls real public adapters
(Open-Meteo and optional grid-context providers configured by environment).
Every response includes a `sources` block with attribution, freshness, cache
status, and degraded-mode warnings.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from typing import Any, Literal, Optional
import json
import logging
import statistics
import time

from dispatchlayer_adapter_open_meteo.client import OpenMeteoClient
from dispatchlayer_domain.models import GeoPoint, ForecastWindow
from dispatchlayer_domain.errors import ProviderUnavailableError, ProviderError

from dispatchlayer_predictive import (
    DecisionRanker,
    LocalSignalScorer,
    PortfolioStateBuilder,
    PredictiveEvolutionEngine,
    compute_trust_score,
    detect_residual_drift,
)
from dispatchlayer_predictive.causal_attribution import attribute_solar_underproduction, attribute_wind_turbine_underproduction
from dispatchlayer_predictive.decision_trace import DecisionTrace
from dispatchlayer_predictive.forecast_bounds import compute_forecast_bounds
from dispatchlayer_predictive.reconciliation import reconcile_forecast
from dispatchlayer_predictive.signal_state import Signal, SignalState
from dispatchlayer_forecasting.solar_irradiance_model import solar_output_kw
from dispatchlayer_forecasting.wind_power_curve import wind_power_output_kw

from .telemetry import _load_production_demo_catalog, _site_file_map

logger = logging.getLogger(__name__)
router = APIRouter(tags=["sites"])


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


def _site_catalog_record(site_id: str) -> dict[str, Any]:
    catalog = _load_production_demo_catalog()
    for rec in [*catalog.get("solar_sites", []), *catalog.get("wind_sites", [])]:
        if rec.get("site_id") == site_id:
            return rec
    raise HTTPException(status_code=404, detail=f"Unknown site_id: {site_id}")


def _load_archive_payload(site_id: str) -> dict[str, Any]:
    path = _site_file_map().get(site_id)
    if path is None or not path.exists():
        raise HTTPException(status_code=404, detail=f"Archive not found for site_id: {site_id}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load archive for {site_id}: {exc}") from exc


def _capacity_mw_for_site(asset_type: str) -> float:
    return 50.0 if asset_type == "solar" else 100.0


def _build_rows(payload: dict[str, Any], history_hours: int) -> list[dict[str, Any]]:
    hourly = payload.get("hourly", {}) if isinstance(payload.get("hourly"), dict) else {}
    times = hourly.get("time", []) if isinstance(hourly.get("time"), list) else []
    start = max(0, len(times) - history_hours)
    fields = [
        "temperature_2m",
        "wind_speed_10m",
        "wind_speed_80m",
        "wind_speed_120m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "shortwave_radiation",
        "direct_normal_irradiance",
        "diffuse_radiation",
        "cloud_cover",
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "relative_humidity_2m",
        "precipitation",
        "pressure_msl",
    ]
    rows: list[dict[str, Any]] = []
    for index in range(start, len(times)):
        row: dict[str, Any] = {"ts": times[index]}
        for field in fields:
            values = hourly.get(field)
            row[field] = values[index] if isinstance(values, list) and index < len(values) else None
        rows.append(row)
    return rows


def _modeled_generation_mw(row: dict[str, Any], asset_type: str, capacity_mw: float) -> float:
    capacity_kw = capacity_mw * 1000.0
    if asset_type == "wind":
        wind_speed = row.get("wind_speed_80m")
        if wind_speed is None:
            wind_speed = row.get("wind_speed_10m")
        if wind_speed is None:
            return 0.0
        return wind_power_output_kw(float(wind_speed), capacity_kw) / 1000.0

    ghi = row.get("shortwave_radiation")
    if ghi is None:
        return 0.0
    temp = row.get("temperature_2m")
    return solar_output_kw(float(ghi), float(temp) if temp is not None else 20.0, capacity_kw) / 1000.0


def _hourly_profile(values: list[dict[str, Any]]) -> list[float]:
    buckets = [{"sum": 0.0, "count": 0} for _ in range(24)]
    for point in values:
        hour = datetime.fromisoformat(str(point["ts"]).replace("Z", "+00:00")).astimezone(timezone.utc).hour
        buckets[hour]["sum"] += float(point["value"])
        buckets[hour]["count"] += 1
    return [bucket["sum"] / bucket["count"] if bucket["count"] else 0.0 for bucket in buckets]


def _stddev(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    return statistics.stdev(values)


def _signal_state_from_row(row: dict[str, Any], asset_type: str, actual_mw: float, now: datetime) -> SignalState:
    signals = {
        "temperature_c": Signal("temperature_c", row.get("temperature_2m"), "C", "archive", now),
        "wind_speed_mps": Signal(
            "wind_speed_mps",
            row.get("wind_speed_80m") if asset_type == "wind" else row.get("wind_speed_10m"),
            "m/s",
            "archive",
            now,
        ),
        "ghi_wm2": Signal("ghi_wm2", row.get("shortwave_radiation"), "W/m2", "archive", now),
        "output_kw": Signal("output_kw", actual_mw * 1000.0, "kW", "modeled_from_archive", now),
        "cloud_cover_pct": Signal("cloud_cover_pct", row.get("cloud_cover"), "pct", "archive", now),
        "soc_pct": Signal("soc_pct", None, "pct", "archive", now),
    }
    return SignalState(signals=signals).normalize()


def _normalized_signal_payload(state: SignalState) -> dict[str, Any]:
    return {
        name: {
            "value": signal.value,
            "confidence": signal.confidence,
            "is_missing": signal.is_missing,
            "is_anomalous": signal.is_anomalous,
            "unit": signal.unit,
        }
        for name, signal in state.signals.items()
    }


def _projection_points(
    start_ts: datetime,
    horizon_hours: int,
    hourly_profile_mw: list[float],
    adjusted_forecast_mwh: float,
    sigma_mw: float,
) -> list[dict[str, Any]]:
    raw_weights: list[float] = []
    timestamps: list[datetime] = []
    for offset in range(1, horizon_hours + 1):
        ts = start_ts + timedelta(hours=offset)
        timestamps.append(ts)
        raw_weights.append(hourly_profile_mw[ts.hour] if hourly_profile_mw[ts.hour] > 0 else 0.05)

    total_weight = sum(raw_weights) or float(horizon_hours)
    sigma_band = max(0.01, sigma_mw)
    projection: list[dict[str, Any]] = []
    for ts, weight in zip(timestamps, raw_weights):
        p50 = adjusted_forecast_mwh * (weight / total_weight)
        projection.append({
            "ts": ts.isoformat(),
            "p50": round(p50, 4),
            "p10": round(max(0.0, p50 - 1.28 * sigma_band), 4),
            "p90": round(p50 + 1.28 * sigma_band, 4),
        })
    return projection


# 
# Models
# 

class SiteEvaluationRequest(BaseModel):
    name: str = "demo_site"
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    asset_type: str = Field("solar", description="solar | wind | wind_solar | bess")
    capacity_mw: float = Field(..., gt=0)
    window_hours: int = Field(24, ge=1, le=168)
    data_mode: Literal["live"] = Field(
        default="live",
        description="live=call real providers",
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


class SitePipelineResponse(BaseModel):
    site_id: str
    name: str
    asset_type: str
    region: Optional[str]
    source: str
    latitude: float
    longitude: float
    history_hours: int
    horizon_hours: int
    capacity_mw: float
    timestamp_utc: str
    latest_sample_utc: str
    current_signals: dict[str, Any]
    normalized_signals: dict[str, Any]
    local_scores: list[dict[str, Any]]
    site_state: dict[str, Any]
    forecast: dict[str, Any]
    reconciliation: dict[str, Any]
    structural_drift: dict[str, Any]
    attribution: list[dict[str, Any]]
    residuals: dict[str, Any]
    projection: list[dict[str, Any]]
    recommendations: list[dict[str, Any]]
    audit_trace: dict[str, Any]


# 
# Provider resolution
# 

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

    # live only
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

        # live mode, do not fallback to fixtures
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


# 
# Endpoint
# 

@router.post("/sites/evaluate", response_model=SiteEvaluationResponse)
async def evaluate_site(req: SiteEvaluationRequest) -> SiteEvaluationResponse:
    now = datetime.now(timezone.utc)
    trace = DecisionTrace(model_versions={"predictive_core": "0.1.0", "pipeline": "LGPD"})

    #  Provider resolution 
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


@router.get("/sites/{site_id}/pipeline", response_model=SitePipelineResponse)
async def site_pipeline(
    site_id: str,
    history_hours: int = Query(default=168, ge=24, le=43800),
    horizon_hours: int = Query(default=168, ge=1, le=168),
) -> SitePipelineResponse:
    record = _site_catalog_record(site_id)
    payload = _load_archive_payload(site_id)
    rows = _build_rows(payload, history_hours)
    if len(rows) < 24:
        raise HTTPException(status_code=400, detail=f"Insufficient history for site_id: {site_id}")

    asset_type = "solar" if site_id.startswith("solar_") else "wind"
    capacity_mw = _capacity_mw_for_site(asset_type)
    latest_ts = datetime.fromisoformat(str(rows[-1]["ts"]).replace("Z", "+00:00")).astimezone(timezone.utc)
    trace = DecisionTrace(model_versions={"predictive_core": "0.1.0", "pipeline": "DPGL_archive"})

    generation_series = [
        {"ts": row["ts"], "value": _modeled_generation_mw(row, asset_type, capacity_mw)}
        for row in rows
    ]
    hourly_profile = _hourly_profile(generation_series)

    residual_mw: list[float] = []
    residual_pct: list[float] = []
    for point in generation_series:
        ts = datetime.fromisoformat(str(point["ts"]).replace("Z", "+00:00")).astimezone(timezone.utc)
        expected = hourly_profile[ts.hour]
        delta = float(point["value"]) - expected
        residual_mw.append(delta)
        residual_pct.append((delta / expected) * 100.0 if expected > 1e-6 else 0.0)

    current_row = rows[-1]
    current_generation_mw = float(generation_series[-1]["value"])
    current_residual_pct = residual_pct[-1] if residual_pct else 0.0
    recent_pct = residual_pct[-24:] if len(residual_pct) >= 24 else residual_pct
    trailing_pct = residual_pct[:-24] if len(residual_pct) > 24 else residual_pct[:-1]
    recent_mw = residual_mw[-48:] if len(residual_mw) >= 48 else residual_mw

    trace.add_step(
        "archive_history_load",
        inputs={"site_id": site_id, "history_hours": history_hours, "horizon_hours": horizon_hours},
        output={"row_count": len(rows), "latest_ts": rows[-1]["ts"]},
        reasoning="Loaded archive-backed site history from the production demo bundle",
    )

    signal_state = _signal_state_from_row(current_row, asset_type, current_generation_mw, latest_ts)
    trace.add_step(
        "signal_normalization",
        inputs={"signal_count": len(signal_state.signals)},
        output={"normalized_count": len(signal_state.signals)},
        reasoning="Normalized current archive-derived signals before scoring and attribution",
    )

    scorer = LocalSignalScorer(now=latest_ts)
    wind_signal = current_row.get("wind_speed_80m") if asset_type == "wind" else current_row.get("wind_speed_10m")
    ghi_signal = current_row.get("shortwave_radiation")
    scores = scorer.score_site_context(
        site_id=site_id,
        wind_speed_mps=float(wind_signal) if wind_signal is not None else None,
        wind_observed_at=latest_ts if wind_signal is not None else None,
        ghi_wm2=float(ghi_signal) if ghi_signal is not None else None,
        solar_observed_at=latest_ts if ghi_signal is not None else None,
        forecast_residual_pct=current_residual_pct,
        residual_observed_at=latest_ts,
    )
    trace.add_step(
        "L_local_signal_scoring",
        inputs={"current_residual_pct": round(current_residual_pct, 4)},
        output={"interactions_scored": len(scores.interactions)},
        reasoning="Scored typed temporal interactions from current archive state with per-type decay",
    )

    builder = PortfolioStateBuilder()
    site_state = builder.build_site_state(
        scores,
        asset_type=asset_type,
        capacity_mw=capacity_mw,
        temperature_c=float(current_row.get("temperature_2m")) if current_row.get("temperature_2m") is not None else None,
    )
    trace.add_step(
        "G_structural_summarization",
        inputs={"asset_type": asset_type, "capacity_mw": capacity_mw},
        output={
            "capacity_factor_estimate": round(site_state.capacity_factor_estimate, 4),
            "data_quality": round(site_state.data_quality, 4),
            "derating_risk": round(site_state.derating_risk, 4),
        },
        reasoning="Compressed local scores into structural site state",
    )

    engine = PredictiveEvolutionEngine()
    prediction = engine.predict_site(site_state, window_hours=horizon_hours)
    trust = compute_trust_score(
        structural_error=prediction.structural_error,
        predictive_error=prediction.predictive_error,
        observational_noise=prediction.observational_noise,
    )
    reconciliation = reconcile_forecast(
        raw_forecast_mwh=prediction.expected_generation_mwh,
        historical_errors=recent_mw,
        telemetry_deviation_pct=current_residual_pct,
    )
    drift_warning = detect_residual_drift(site_id, recent_pct, trailing_pct)
    bounds = compute_forecast_bounds(
        reconciliation.adjusted_forecast_mwh,
        historical_errors=recent_mw,
        uncertainty_factors={
            "drift": drift_warning.drift_magnitude,
            "structural": prediction.structural_error,
            "predictive": prediction.predictive_error,
            "observational": prediction.observational_noise,
        },
    )
    trace.add_step(
        "P_predictive_evolution",
        inputs={"window_hours": horizon_hours},
        output={
            "raw_forecast_mwh": round(prediction.expected_generation_mwh, 4),
            "adjusted_forecast_mwh": round(reconciliation.adjusted_forecast_mwh, 4),
            "trust_score": round(trust.trust_score, 4),
        },
        reasoning="Propagated structural site state into a forecast, then reconciled it against recent residual history",
    )

    if asset_type == "wind":
        attribution = attribute_wind_turbine_underproduction(signal_state, current_residual_pct)
    else:
        attribution = attribute_solar_underproduction(signal_state, current_residual_pct)
    trace.add_step(
        "structural_drift_and_attribution",
        inputs={"recent_count": len(recent_pct), "baseline_count": len(trailing_pct)},
        output={"drift_risk": drift_warning.risk.value, "attribution_count": len(attribution)},
        reasoning="Assessed drift and ranked attribution hypotheses from the current residual state",
    )

    ranker = DecisionRanker(price_per_mwh=45.0)
    decision_set = ranker.rank_site(prediction, forecast_residual_pct=current_residual_pct)
    projection = _projection_points(
        latest_ts,
        horizon_hours,
        hourly_profile,
        reconciliation.adjusted_forecast_mwh,
        _stddev(recent_mw),
    )

    return SitePipelineResponse(
        site_id=site_id,
        name=str(record.get("name") or site_id),
        asset_type=asset_type,
        region=record.get("region"),
        source="archive_pipeline",
        latitude=float(record.get("latitude") or payload.get("latitude") or 0.0),
        longitude=float(record.get("longitude") or payload.get("longitude") or 0.0),
        history_hours=history_hours,
        horizon_hours=horizon_hours,
        capacity_mw=capacity_mw,
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
        latest_sample_utc=str(rows[-1]["ts"]),
        current_signals={
            "temperature_2m": current_row.get("temperature_2m"),
            "wind_speed_10m": current_row.get("wind_speed_10m"),
            "wind_speed_80m": current_row.get("wind_speed_80m"),
            "wind_speed_120m": current_row.get("wind_speed_120m"),
            "wind_direction_10m": current_row.get("wind_direction_10m"),
            "wind_gusts_10m": current_row.get("wind_gusts_10m"),
            "shortwave_radiation": current_row.get("shortwave_radiation"),
            "direct_normal_irradiance": current_row.get("direct_normal_irradiance"),
            "diffuse_radiation": current_row.get("diffuse_radiation"),
            "cloud_cover": current_row.get("cloud_cover"),
            "cloud_cover_low": current_row.get("cloud_cover_low"),
            "cloud_cover_mid": current_row.get("cloud_cover_mid"),
            "cloud_cover_high": current_row.get("cloud_cover_high"),
            "relative_humidity_2m": current_row.get("relative_humidity_2m"),
            "precipitation": current_row.get("precipitation"),
            "pressure_msl": current_row.get("pressure_msl"),
            "derived_generation_mw": round(current_generation_mw, 4),
        },
        normalized_signals=_normalized_signal_payload(signal_state),
        local_scores=[
            {
                "interaction_type": interaction.interaction_type.value,
                "source_entity_id": interaction.source_entity_id,
                "target_entity_id": interaction.target_entity_id,
                "raw_value": round(interaction.raw_value, 4),
                "score": round(interaction.score, 4),
                "temporal_weight": round(interaction.temporal_weight, 4),
                "data_quality": round(interaction.data_quality, 4),
            }
            for interaction in scores.interactions
        ],
        site_state={
            "weather_score": round(site_state.weather_score, 4),
            "grid_score": round(site_state.grid_score, 4),
            "market_score": round(site_state.market_score, 4),
            "forecast_disagreement_score": round(site_state.forecast_disagreement_score, 4),
            "battery_readiness_score": round(site_state.battery_readiness_score, 4),
            "capacity_factor_estimate": round(site_state.capacity_factor_estimate, 4),
            "derating_risk": round(site_state.derating_risk, 4),
            "data_quality": round(site_state.data_quality, 4),
            "observational_noise": round(site_state.observational_noise, 4),
        },
        forecast={
            "raw_expected_generation_mwh": round(prediction.expected_generation_mwh, 4),
            "raw_p10_mwh": round(prediction.p10_generation_mwh, 4),
            "raw_p50_mwh": round(prediction.p50_generation_mwh, 4),
            "raw_p90_mwh": round(prediction.p90_generation_mwh, 4),
            "calibrated_p10_mwh": round(bounds.p10, 4),
            "calibrated_p50_mwh": round(bounds.p50, 4),
            "calibrated_p90_mwh": round(bounds.p90, 4),
            "uncertainty_score": round(bounds.uncertainty_score, 4),
            "forecast_trust_score": round(trust.trust_score, 4),
            "forecast_trust_grade": trust.grade,
            "dominant_term": trust.dominant_term,
            "error_decomposition": {
                "structural_error": {
                    "score": round(trust.structural_error.score, 4),
                    "meaning": trust.structural_error.meaning,
                    "action": trust.structural_error.action,
                },
                "predictive_error": {
                    "score": round(trust.predictive_error.score, 4),
                    "meaning": trust.predictive_error.meaning,
                    "action": trust.predictive_error.action,
                },
                "observational_noise": {
                    "score": round(trust.observational_noise.score, 4),
                    "meaning": trust.observational_noise.meaning,
                    "action": trust.observational_noise.action,
                },
            },
            "risk_factors": prediction.risk_factors,
            "trust_warnings": trust.warnings,
        },
        reconciliation={
            "adjusted_forecast_mwh": round(reconciliation.adjusted_forecast_mwh, 4),
            "bias_correction_mwh": round(reconciliation.bias_correction, 4),
            "confidence": round(reconciliation.confidence, 4),
            "basis": reconciliation.basis,
        },
        structural_drift={
            "risk": drift_warning.risk.value,
            "reason": drift_warning.reason,
            "likely_effects": drift_warning.likely_effects,
            "threshold_state_label": drift_warning.threshold_state_label,
            "drift_magnitude": drift_warning.drift_magnitude,
        },
        attribution=[
            {
                "cause": hypothesis.cause,
                "confidence": round(hypothesis.confidence, 4),
                "evidence": hypothesis.evidence,
            }
            for hypothesis in attribution
        ],
        residuals={
            "current_pct": round(current_residual_pct, 4),
            "recent_mean_pct": round(statistics.mean(recent_pct), 4) if recent_pct else 0.0,
            "recent_sigma_pct": round(_stddev(recent_pct), 4),
            "recent_mean_mw": round(statistics.mean(recent_mw), 4) if recent_mw else 0.0,
            "recent_sigma_mw": round(_stddev(recent_mw), 4),
        },
        projection=projection,
        recommendations=[
            {
                "recommendation_id": recommendation.recommendation_id,
                "recommendation_type": recommendation.recommendation_type.value,
                "priority": recommendation.priority.value,
                "action": recommendation.action,
                "why_now": recommendation.why_now,
                "evidence": recommendation.evidence,
                "confidence": recommendation.confidence,
                "urgency_hours": recommendation.urgency_hours,
                "estimated_value_usd": recommendation.estimated_value_usd,
                "risk_if_ignored": recommendation.risk_if_ignored,
                "signal_score": recommendation.signal_score,
                "audit_trace_id": recommendation.audit_trace_id,
            }
            for recommendation in decision_set.recommendations
        ],
        audit_trace=trace.to_dict(),
    )

