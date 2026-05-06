# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import logging

from dispatchlayer_domain.models import AssetTelemetry, WeatherSample, AssetType
from dispatchlayer_anomaly.detector import detect_anomaly
from dispatchlayer_anomaly.conditions import AnomalyCondition

logger = logging.getLogger(__name__)
router = APIRouter(tags=["anomalies"])


class AnomalyDetectRequest(BaseModel):
    asset_id: str
    site_id: str
    asset_type: str
    output_kw: float
    capacity_kw: float
    curtailment_flag: bool = False
    wind_speed_mps: Optional[float] = None
    temperature_c: Optional[float] = None
    ghi_wm2: Optional[float] = None
    timestamp_utc: Optional[datetime] = None
    threshold_pct: float = 10.0


@router.post("/anomalies/detect")
async def detect_asset_anomaly(req: AnomalyDetectRequest) -> dict:
    ts = req.timestamp_utc or datetime.now(timezone.utc)

    try:
        asset_type = AssetType(req.asset_type)
    except ValueError:
        return {"error": f"Unknown asset_type: {req.asset_type}"}

    telemetry = AssetTelemetry(
        timestamp_utc=ts,
        asset_id=req.asset_id,
        site_id=req.site_id,
        asset_type=asset_type,
        output_kw=req.output_kw,
        capacity_kw=req.capacity_kw,
        curtailment_flag=req.curtailment_flag,
    )

    weather = WeatherSample(
        timestamp_utc=ts,
        temperature_c=req.temperature_c,
        wind_speed_mps=req.wind_speed_mps,
        wind_direction_deg=None,
        cloud_cover_pct=None,
        shortwave_radiation_wm2=req.ghi_wm2,
        direct_radiation_wm2=None,
        diffuse_radiation_wm2=None,
        source="api_request",
    )

    event = detect_anomaly(telemetry, weather, req.threshold_pct)
    if event is None:
        return {"deviation_detected": False, "asset_id": req.asset_id}

    return {
        "deviation_detected": True,
        "event_id":           event.event_id,
        "asset_id":           event.asset_id,
        "site_id":            event.site_id,
        "condition":          event.condition.value,
        "residual_pct":       event.residual_pct,
        "expected_output_kw": event.expected_output_kw,
        "actual_output_kw":   event.actual_output_kw,
        "confidence":         event.confidence,
        "hypotheses": [
            {"cause": h.cause, "confidence": h.confidence, "evidence": h.evidence}
            for h in event.hypotheses
        ],
        "decision_trace": event.decision_trace.to_dict(),
    }


@router.get("/anomalies/conditions")
async def list_conditions() -> dict:
    return {"conditions": [c.value for c in AnomalyCondition]}
