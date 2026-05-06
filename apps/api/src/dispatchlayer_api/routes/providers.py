from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import asyncio
import time
import logging
import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["providers"])


class ProviderStatus(BaseModel):
    name: str
    enabled: bool
    requires_key: bool
    key_configured: bool


class ProvidersResponse(BaseModel):
    providers: list[ProviderStatus]


@router.get("/providers", response_model=ProvidersResponse)
async def list_providers() -> ProvidersResponse:
    settings = get_settings()
    return ProvidersResponse(providers=[
        ProviderStatus(name="open_meteo", enabled=settings.open_meteo_enabled, requires_key=False, key_configured=True),
        ProviderStatus(name="noaa_nws", enabled=settings.noaa_nws_enabled, requires_key=False, key_configured=True),
        ProviderStatus(name="nasa_power", enabled=settings.nasa_power_enabled, requires_key=False, key_configured=True),
        ProviderStatus(name="nrel", enabled=True, requires_key=True, key_configured=bool(settings.nrel_api_key)),
        ProviderStatus(name="eia", enabled=True, requires_key=True, key_configured=bool(settings.eia_api_key)),
        ProviderStatus(name="entsoe", enabled=True, requires_key=True, key_configured=bool(settings.entsoe_api_key)),
    ])


async def _probe(url: str, timeout: float = 5.0) -> tuple[str, float | None]:
    """
    Lightweight provider reachability probe.

    Returns ("success" | "unreachable" | "error", latency_ms | None).
    The probe uses a minimal parameter set to minimise upstream load.
    """
    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url)
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        if resp.status_code < 400:
            return "success", latency_ms
        return "error", latency_ms
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError):
        return "unreachable", None


@router.get("/providers/health")
async def providers_health() -> dict:
    """
    Live provider health check.

    For each enabled, key-free provider this sends a minimal probe request and
    reports reachability and latency.  Key-gated providers report "unconfigured"
    when no key is set.

    Notes
    -----
    Open-Meteo probe: single-hour forecast for (0°, 0°) — intentionally minimal.
    NASA POWER probe: single-day, single-parameter for (0°, 0°).
    NOAA/NWS: gridpoints probe for (0°, 0°) — may return 404 (expected, counts as reachable).
    """
    settings = get_settings()
    now_utc = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()

    # Build probe tasks for key-free providers
    probe_tasks: dict[str, asyncio.Task] = {}

    if settings.open_meteo_enabled:
        probe_tasks["open_meteo"] = asyncio.create_task(
            _probe("https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&hourly=temperature_2m&forecast_days=1")
        )

    if settings.nasa_power_enabled:
        probe_tasks["nasa_power"] = asyncio.create_task(
            _probe("https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M&community=RE&longitude=0&latitude=0&start=20240101&end=20240101&format=JSON")
        )

    if settings.noaa_nws_enabled:
        probe_tasks["noaa_nws"] = asyncio.create_task(
            _probe("https://api.weather.gov/gridpoints/OKX/33,37/forecast")
        )

    results = {}
    if probe_tasks:
        probe_results = await asyncio.gather(*probe_tasks.values(), return_exceptions=True)
        for name, result in zip(probe_tasks.keys(), probe_results):
            if isinstance(result, Exception):
                results[name] = {"status": "error", "latency_ms": None, "checked_utc": now_utc}
            else:
                status, latency_ms = result
                results[name] = {"status": status, "latency_ms": latency_ms, "checked_utc": now_utc}

    # Key-gated providers
    for name, key_attr in [("nrel", "nrel_api_key"), ("eia", "eia_api_key"), ("entsoe", "entsoe_api_key")]:
        if getattr(settings, key_attr):
            results[name] = {"status": "configured_not_probed", "checked_utc": now_utc}
        else:
            results[name] = {
                "status": "unconfigured",
                "degraded_mode": f"Set GRIDFORGE_{key_attr.upper()} to enable",
                "checked_utc": now_utc,
            }

    warnings = []
    for name, info in results.items():
        if info.get("status") == "unconfigured":
            warnings.append(f"{name.upper()}_API_KEY not configured; {info.get('degraded_mode', 'provider disabled')}.")

    return {
        "status": "ok",
        "checked_utc": now_utc,
        "providers": results,
        "warnings": warnings,
    }
