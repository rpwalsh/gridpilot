"""
Telemetry ingestion and retrieval endpoints.

POST /api/v1/telemetry/ingest        — ingest one or more TelemetryPoint records
POST /api/v1/telemetry/ingest/csv    — (planned) CSV/Parquet upload
POST /api/v1/telemetry/normalize     — normalise raw points to AssetTelemetrySnapshot
GET  /api/v1/sites/{site_id}/telemetry/latest  — latest snapshot per asset in a site
GET  /api/v1/assets/{asset_id}/health          — health summary for a single asset

In a deployed system these endpoints ingest from SCADA historians, edge gateways,
MQTT streams, OPC UA servers, Modbus gateways, and CSV/Parquet exports.
The public demo populates responses from recorded fixtures to be honest about
what is live vs. recorded.

Planned adapters (not yet implemented):
  OPC UA — planned
  Modbus gateway — planned
  MQTT — planned
  SCADA historian connector — planned
"""

from __future__ import annotations

import json
import pathlib
from datetime import datetime, timezone
from typing import Optional
import logging

from fastapi import APIRouter, Query
from pydantic import BaseModel

from dispatchlayer_domain.telemetry import TelemetryPoint, AssetTelemetrySnapshot

logger = logging.getLogger(__name__)
router = APIRouter(tags=["telemetry"])

_SCADA_FIXTURE = (
    pathlib.Path(__file__).parent.parent.parent.parent.parent
    / "tests" / "fixtures" / "scada_fleet_snapshot.json"
)


def _load_scada_fixture() -> dict:
    """Load the recorded SCADA fleet fixture (used for offline demo and tests)."""
    try:
        return json.loads(_SCADA_FIXTURE.read_text())
    except FileNotFoundError:
        return {}


# In-process in-memory store (replaced by a real TSDB in production)
_telemetry_store: list[TelemetryPoint] = []
_snapshot_store: dict[str, list[AssetTelemetrySnapshot]] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Ingest
# ─────────────────────────────────────────────────────────────────────────────

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
    per group using the most recent timestamp.  Partial snapshots are allowed —
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


# ─────────────────────────────────────────────────────────────────────────────
# Retrieval
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/sites/{site_id}/telemetry/latest")
async def site_telemetry_latest(
    site_id: str,
    data_mode: str = Query(default="fixture", description="live | fixture"),
) -> dict:
    """
    Latest AssetTelemetrySnapshot per asset at the given site.

    data_mode=fixture  — returns recorded SCADA fixture (deterministic, offline-safe)
    data_mode=live     — returns the most recent ingested snapshot from the in-process
                         store (populated via POST /telemetry/ingest)
    """
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
            "assets": [s.model_dump(mode="json") for s in latest.values()],
        }

    # fixture mode
    fixture = _load_scada_fixture()
    site_assets = [a for a in fixture.get("assets", []) if a.get("site_id") == site_id]

    if not site_assets:
        # Fall back to all assets in the fixture if site_id not found
        site_assets = fixture.get("assets", [])
        warning = f"Site '{site_id}' not in fixture; returning all fixture assets."
    else:
        warning = None

    resp: dict = {
        "site_id": site_id,
        "data_mode": "fixture",
        "snapshot_timestamp_utc": fixture.get("snapshot_timestamp_utc"),
        "asset_count": len(site_assets),
        "assets": site_assets,
        "data_notice": (
            "Recorded fixture for deterministic testing and offline demo. "
            "Real SCADA feeds are customer-owned. "
            "See _provenance block in apps/api/tests/fixtures/scada_fleet_snapshot.json."
        ),
    }
    if warning:
        resp["warning"] = warning
    return resp


@router.get("/assets/{asset_id}/health")
async def asset_health(
    asset_id: str,
    data_mode: str = Query(default="fixture", description="live | fixture"),
) -> dict:
    """
    Health summary for a single asset.

    Returns snapshot, anomaly residual relative to expected output,
    and a root-cause ranking when anomaly data is present in the fixture.
    """
    fixture = _load_scada_fixture()
    asset = next((a for a in fixture.get("assets", []) if a.get("asset_id") == asset_id), None)

    if data_mode == "live":
        # Search in-memory store
        all_snaps = [s for snaps in _snapshot_store.values() for s in snaps]
        live = next((s for s in reversed(all_snaps) if s.asset_id == asset_id), None)
        if live:
            asset = live.model_dump(mode="json")

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
