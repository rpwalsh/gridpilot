# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
Telemetry ingestion and retrieval endpoints.

POST /api/v1/telemetry/ingest         ingest one or more TelemetryPoint records
POST /api/v1/telemetry/ingest/csv     (planned) CSV/Parquet upload
POST /api/v1/telemetry/normalize      normalise raw points to AssetTelemetrySnapshot
GET  /api/v1/sites/{site_id}/telemetry/latest   latest snapshot per asset in a site
GET  /api/v1/assets/{asset_id}/health           health summary for a single asset

In a deployed system these endpoints ingest from SCADA historians, edge gateways,
MQTT streams, OPC UA servers, Modbus gateways, and CSV/Parquet exports.
For the public repo, this route supports source-backed snapshots loaded from
data/source_snapshots/*.json so the UI can render real dataset captures without
pretending to have private SCADA access.
"""

from __future__ import annotations

import json
import pathlib
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, Any
import logging

from fastapi import APIRouter, Query
from pydantic import BaseModel

from dispatchlayer_domain.telemetry import TelemetryPoint, AssetTelemetrySnapshot

logger = logging.getLogger(__name__)
router = APIRouter(tags=["telemetry"])

_SOURCE_SNAPSHOT_DIR = (
    pathlib.Path(__file__).parent.parent.parent.parent.parent.parent
    / "data"
    / "source_snapshots"
)

_PRODUCTION_DEMO_CATALOG = (
    pathlib.Path(__file__).parent.parent.parent.parent.parent.parent
    / "data"
    / "raw"
    / "curl"
    / "production_demo"
    / "catalog.json"
)


def _load_source_snapshots() -> list[dict[str, Any]]:
    """Load all source snapshot files from data/source_snapshots."""
    if not _SOURCE_SNAPSHOT_DIR.exists():
        return []

    snapshots: list[dict[str, Any]] = []
    for path in sorted(_SOURCE_SNAPSHOT_DIR.glob("*.json")):
        try:
            snapshots.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            logger.warning("Skipping unreadable source snapshot file: %s", path)
    return snapshots


def _normalize_metric_key(metric: str) -> str:
    return metric.strip().lower().replace("-", "_").replace(" ", "_")


def _snapshot_from_source_payload(payload: dict[str, Any]) -> Optional[AssetTelemetrySnapshot]:
    """Convert one source snapshot payload into a single latest asset snapshot."""
    series = payload.get("series", [])
    if not isinstance(series, list) or not series:
        return None

    site = payload.get("site", {}) if isinstance(payload.get("site"), dict) else {}
    site_id = str(site.get("site_id") or payload.get("site_id") or "unknown")
    asset_id = str(site.get("asset_id") or f"{site_id}-source-1")
    asset_type = str(site.get("asset_type") or "solar_inverter")
    capacity_kw = float(site.get("capacity_kw") or 1000.0)

    by_ts: dict[datetime, dict[str, float]] = defaultdict(dict)
    for point in series:
        if not isinstance(point, dict):
            continue
        ts_raw = point.get("timestamp_utc")
        metric_raw = point.get("metric")
        value_raw = point.get("value")
        if ts_raw is None or metric_raw is None:
            continue
        try:
            ts = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
        except ValueError:
            continue

        try:
            value = float(value_raw)
        except (TypeError, ValueError):
            continue

        by_ts[ts][_normalize_metric_key(str(metric_raw))] = value

    if not by_ts:
        return None

    latest_ts = max(by_ts.keys())
    latest = by_ts[latest_ts]
    power_kw = (
        latest.get("ac_power")
        or latest.get("ac_power_kw")
        or latest.get("power_kw")
        or latest.get("power")
    )
    expected_kw = (
        latest.get("expected_power_kw")
        or latest.get("clear_sky_power_kw")
        or latest.get("modeled_power_kw")
    )
    temp_c = (
        latest.get("temperature_c")
        or latest.get("ambient_temperature_c")
        or latest.get("module_temperature_c")
    )
    wind_mps = latest.get("wind_speed_mps") or latest.get("wind_speed")
    avail_pct = latest.get("availability_pct")
    quality_score = latest.get("quality_score", 1.0)

    source_record = payload.get("source_record", {}) if isinstance(payload.get("source_record"), dict) else {}
    provider = str(source_record.get("provider") or payload.get("dataset_id") or "source_snapshot")

    return AssetTelemetrySnapshot(
        timestamp_utc=latest_ts,
        site_id=site_id,
        asset_id=asset_id,
        asset_type=asset_type,
        capacity_kw=capacity_kw,
        power_kw=power_kw,
        expected_power_kw=expected_kw,
        availability_pct=avail_pct,
        temperature_c=temp_c,
        wind_speed_mps=wind_mps,
        quality_score=max(0.0, min(1.0, float(quality_score))),
        data_source=provider,
    )


def _source_assets_for_site(site_id: str) -> list[AssetTelemetrySnapshot]:
    snapshots = [_snapshot_from_source_payload(p) for p in _load_source_snapshots()]
    snapshots.extend(_load_production_demo_snapshots())
    assets = [s for s in snapshots if s is not None]
    if site_id == "all":
        return assets
    return [s for s in assets if s.site_id == site_id]


def _load_production_demo_snapshots() -> list[AssetTelemetrySnapshot]:
    """Load latest snapshots from raw Open-Meteo files listed in production_demo/catalog.json."""
    if not _PRODUCTION_DEMO_CATALOG.exists():
        return []

    try:
        catalog = json.loads(_PRODUCTION_DEMO_CATALOG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []

    records: list[dict[str, Any]] = []
    records.extend(catalog.get("solar_sites", []) if isinstance(catalog.get("solar_sites"), list) else [])
    records.extend(catalog.get("wind_sites", []) if isinstance(catalog.get("wind_sites"), list) else [])

    out: list[AssetTelemetrySnapshot] = []
    repo_root = pathlib.Path(__file__).parent.parent.parent.parent.parent.parent

    for rec in records:
        ts_file = rec.get("timeseries_file")
        if not isinstance(ts_file, str) or not ts_file:
            continue

        src_path = repo_root / ts_file
        if not src_path.exists():
            continue

        try:
            payload = json.loads(src_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        hourly = payload.get("hourly") if isinstance(payload.get("hourly"), dict) else {}
        times = hourly.get("time") if isinstance(hourly.get("time"), list) else []
        if not times:
            continue

        i = len(times) - 1
        ts_raw = str(times[i]) + "Z"
        try:
            ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
        except ValueError:
            continue

        def _at(name: str) -> Optional[float]:
            arr = hourly.get(name)
            if not isinstance(arr, list) or i >= len(arr):
                return None
            v = arr[i]
            try:
                return float(v)
            except (TypeError, ValueError):
                return None

        site_id = str(rec.get("site_id") or "unknown")
        is_solar = site_id.startswith("solar_")
        asset_type = "solar_inverter" if is_solar else "wind_turbine"
        capacity_kw = 50000.0 if is_solar else 100000.0

        wind_speed = _at("wind_speed_10m")
        temperature = _at("temperature_2m")
        ghi = _at("shortwave_radiation")

        # Keep telemetry grounded in measured fields; do not synthesize power outputs.
        snap = AssetTelemetrySnapshot(
            timestamp_utc=ts,
            site_id=site_id,
            asset_id=f"{site_id}-wx-01",
            asset_type=asset_type,
            capacity_kw=capacity_kw,
            power_kw=None,
            expected_power_kw=None,
            availability_pct=100.0,
            temperature_c=temperature,
            wind_speed_mps=wind_speed,
            quality_score=1.0,
            data_source="open_meteo_archive",
            # extra signals preserved via model fields used elsewhere
            ghi_wm2=ghi,
        )
        out.append(snap)

    return out


def _load_production_demo_catalog() -> dict[str, Any]:
    if not _PRODUCTION_DEMO_CATALOG.exists():
        return {}
    try:
        return json.loads(_PRODUCTION_DEMO_CATALOG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _catalog_site_summaries() -> list[dict[str, Any]]:
    catalog = _load_production_demo_catalog()
    records: list[dict[str, Any]] = []
    records.extend(catalog.get("solar_sites", []) if isinstance(catalog.get("solar_sites"), list) else [])
    records.extend(catalog.get("wind_sites", []) if isinstance(catalog.get("wind_sites"), list) else [])

    summaries: list[dict[str, Any]] = []
    repo_root = pathlib.Path(__file__).parent.parent.parent.parent.parent.parent

    for rec in records:
        ts_file = rec.get("timeseries_file")
        if not isinstance(ts_file, str) or not ts_file:
            continue

        src_path = repo_root / ts_file
        if not src_path.exists():
            continue

        try:
            payload = json.loads(src_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        hourly = payload.get("hourly") if isinstance(payload.get("hourly"), dict) else {}
        times = hourly.get("time") if isinstance(hourly.get("time"), list) else []
        if not times:
            continue

        idx = len(times) - 1

        def _at(name: str) -> Optional[float]:
            values = hourly.get(name)
            if not isinstance(values, list) or idx >= len(values):
                return None
            try:
                value = values[idx]
                return None if value is None else float(value)
            except (TypeError, ValueError):
                return None

        site_id = str(rec.get("site_id") or "unknown")
        asset_type = "solar" if site_id.startswith("solar_") else "wind"
        timestamp_utc = f"{times[idx]}:00Z" if len(times[idx]) == 16 else str(times[idx])
        summaries.append(
            {
                "site_id": site_id,
                "name": rec.get("name") or site_id,
                "asset_type": asset_type,
                "region": rec.get("region"),
                "source": rec.get("source") or payload.get("provider") or "unknown",
                "time_resolution": rec.get("time_resolution") or "hourly",
                "hourly_points": rec.get("hourly_points") or len(times),
                "timestamp_utc": timestamp_utc,
                "temperature_c": _at("temperature_2m"),
                "wind_speed_mps": _at("wind_speed_10m"),
                "wind_direction_deg": _at("wind_direction_10m"),
                "ghi_wm2": _at("shortwave_radiation"),
            }
        )

    summaries.sort(key=lambda item: str(item.get("site_id")))
    return summaries


# In-process in-memory store (replaced by a real TSDB in production)
_telemetry_store: list[TelemetryPoint] = []
_snapshot_store: dict[str, list[AssetTelemetrySnapshot]] = {}


# 
# Ingest
# 

class TelemetryIngestRequest(BaseModel):
    points: list[TelemetryPoint]


@router.post("/telemetry/ingest")
async def ingest_telemetry(req: TelemetryIngestRequest) -> dict:
    """
    Ingest one or more raw TelemetryPoint records.

    In production this writes to a time-series database (e.g. InfluxDB, TimescaleDB).
    In the public demo it writes to an in-process list (not persisted across restarts).
    """
    _telemetry_store.extend(req.points)
    logger.info("Ingested %d telemetry points", len(req.points))
    return {
        "ingested": len(req.points),
        "total_in_store": len(_telemetry_store),
        "data_source": "api_ingest",
    }


@router.post("/telemetry/normalize")
async def normalize_telemetry(req: TelemetryIngestRequest) -> dict:
    """
    Normalise raw TelemetryPoint records into AssetTelemetrySnapshot summaries.

    Groups points by (site_id, asset_id, asset_type) and produces one snapshot
    per group using the most recent timestamp.  Partial snapshots are allowed 
    missing signals are null.
    """
    from collections import defaultdict

    groups: dict[tuple, list[TelemetryPoint]] = defaultdict(list)
    for p in req.points:
        groups[(p.site_id, p.asset_id, p.asset_type)].append(p)

    snapshots = []
    for (site_id, asset_id, asset_type), points in groups.items():
        ts = max(p.timestamp_utc for p in points)
        signals = {p.signal: p.value for p in points}
        snap = AssetTelemetrySnapshot(
            timestamp_utc=ts,
            site_id=site_id,
            asset_id=asset_id,
            asset_type=asset_type,
            capacity_kw=float(signals.get("capacity_kw", 0)),
            power_kw=signals.get("power_kw"),
            expected_power_kw=signals.get("expected_power_kw"),
            availability_pct=signals.get("availability_pct"),
            temperature_c=signals.get("temperature_c"),
            wind_speed_mps=signals.get("wind_speed_mps"),
            wind_direction_deg=signals.get("wind_direction_deg"),
            rotor_rpm=signals.get("rotor_rpm"),
            yaw_error_deg=signals.get("yaw_error_deg"),
            blade_pitch_deg=signals.get("blade_pitch_deg"),
            state_of_charge_pct=signals.get("state_of_charge_pct"),
            fault_code=signals.get("fault_code"),
            curtailment_flag=signals.get("curtailment_flag"),
            quality_score=float(signals.get("quality_score", 1.0)),
            data_source="api_normalize",
        )
        _snapshot_store.setdefault(site_id, []).append(snap)
        snapshots.append(snap.model_dump(mode="json"))

    return {"normalized": len(snapshots), "snapshots": snapshots}


# 
# Retrieval
# 

@router.get("/sites/{site_id}/telemetry/latest")
async def site_telemetry_latest(
    site_id: str,
    data_mode: str = Query(default="source", description="source | live"),
) -> dict:
    """
    Latest AssetTelemetrySnapshot per asset at the given site.

    data_mode=source    returns source-backed snapshots loaded from data/source_snapshots
    data_mode=live      returns the most recent ingested snapshot from the in-process
                         store (populated via POST /telemetry/ingest)
    Fixture mode is intentionally disabled in this production demo path.
    """
    if data_mode == "source":
        assets = _source_assets_for_site(site_id)
        if not assets:
            return {
                "site_id": site_id,
                "data_mode": "source",
                "warning": (
                    "No source snapshots found for this site. Add JSON files under "
                    "data/source_snapshots or run scripts/capture_pvdaq_snapshot.py."
                ),
                "assets": [],
            }

        latest_ts = max(a.timestamp_utc for a in assets)
        return {
            "site_id": site_id,
            "data_mode": "source",
            "snapshot_timestamp_utc": latest_ts.isoformat(),
            "asset_count": len(assets),
            "available_sites": sorted({a.site_id for a in _source_assets_for_site("all")}),
            "assets": [a.model_dump(mode="json") for a in assets],
            "data_notice": "Loaded from source snapshots in data/source_snapshots.",
        }

    if data_mode == "live":
        snapshots = _snapshot_store.get(site_id, [])
        # Keep only the latest per asset_id
        latest: dict[str, AssetTelemetrySnapshot] = {}
        for snap in snapshots:
            prev = latest.get(snap.asset_id)
            if prev is None or snap.timestamp_utc > prev.timestamp_utc:
                latest[snap.asset_id] = snap

        if not latest:
            return {
                "site_id": site_id,
                "data_mode": "live",
                "warning": "No telemetry ingested yet for this site. POST to /api/v1/telemetry/ingest first.",
                "assets": [],
            }

        return {
            "site_id": site_id,
            "data_mode": "live",
            "asset_count": len(latest),
            "available_sites": sorted(_snapshot_store.keys()),
            "assets": [s.model_dump(mode="json") for s in latest.values()],
        }
    return {
        "site_id": site_id,
        "data_mode": data_mode,
        "error": "Unsupported data_mode. Use source or live.",
        "assets": [],
    }


@router.get("/assets/{asset_id}/health")
async def asset_health(
    asset_id: str,
    data_mode: str = Query(default="source", description="source | live"),
) -> dict:
    """
    Health summary for a single asset.

    Returns snapshot and anomaly residual relative to expected output.
    """
    source_assets = [s.model_dump(mode="json") for s in _source_assets_for_site("all")]
    asset = next((a for a in source_assets if a.get("asset_id") == asset_id), None)

    if data_mode == "live":
        # Search in-memory store
        all_snaps = [s for snaps in _snapshot_store.values() for s in snaps]
        live = next((s for s in reversed(all_snaps) if s.asset_id == asset_id), None)
        if live:
            asset = live.model_dump(mode="json")
    elif data_mode not in {"source", "live"}:
        return {"asset_id": asset_id, "data_mode": data_mode, "error": "Unsupported data_mode. Use source or live."}

    if asset is None:
        return {"asset_id": asset_id, "data_mode": data_mode, "error": "Asset not found"}

    power_kw = asset.get("power_kw")
    expected_kw = asset.get("expected_power_kw")
    residual_pct = (
        round((power_kw - expected_kw) / expected_kw * 100, 1)
        if power_kw is not None and expected_kw and expected_kw > 0
        else None
    )
    anomaly = residual_pct is not None and abs(residual_pct) > 10.0

    health_score = asset.get("quality_score", 1.0) * asset.get("availability_pct", 100.0) / 100.0

    resp: dict = {
        "asset_id": asset_id,
        "data_mode": data_mode,
        "snapshot": asset,
        "health_score": round(health_score, 3),
        "anomaly_detected": anomaly,
        "residual_pct": residual_pct,
        "fault_code": asset.get("fault_code"),
    }

    if anomaly and "_anomaly_notes" in asset:
        resp["root_cause_ranking"] = asset["_anomaly_notes"].get("root_cause_ranking", [])

    return resp


@router.get("/overview/source-summary")
async def overview_source_summary() -> dict:
    catalog = _load_production_demo_catalog()
    site_summaries = _catalog_site_summaries()
    coverage = catalog.get("coverage", {}) if isinstance(catalog.get("coverage"), dict) else {}
    pvdaq_top = catalog.get("pvdaq_top_systems", []) if isinstance(catalog.get("pvdaq_top_systems"), list) else []

    total_hourly_points = sum(int(item.get("hourly_points") or 0) for item in site_summaries)
    solar_sites = sum(1 for item in site_summaries if item.get("asset_type") == "solar")
    wind_sites = sum(1 for item in site_summaries if item.get("asset_type") == "wind")
    latest_timestamp = max((str(item.get("timestamp_utc") or "") for item in site_summaries), default="")

    return {
        "dataset": catalog.get("dataset", "dispatchlayer-production-demo"),
        "generated_utc": catalog.get("generated_utc"),
        "coverage": {
            "start_date": coverage.get("start_date"),
            "end_date": coverage.get("end_date"),
            "years": coverage.get("years"),
            "time_resolution": coverage.get("time_resolution"),
        },
        "totals": {
            "site_count": len(site_summaries),
            "solar_site_count": solar_sites,
            "wind_site_count": wind_sites,
            "total_hourly_points": total_hourly_points,
            "pvdaq_system_count": len(pvdaq_top),
        },
        "latest_timestamp_utc": latest_timestamp,
        "sites": site_summaries,
        "power_data_status": {
            "site_level_weather_available": True,
            "site_level_power_available": False,
            "component_scada_available": False,
            "detail": "This public offline bundle contains real 5-year hourly weather/resource data for 10 sites. It does not contain plant SCADA, inverter telemetry, battery telemetry, or measured per-component power timeseries.",
        },
    }

