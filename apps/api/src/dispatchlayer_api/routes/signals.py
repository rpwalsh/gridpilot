# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import logging

from dispatchlayer_domain.models import AssetTelemetry, WeatherSample, AssetType
from dispatchlayer_anomaly.detector import detect_anomaly
from dispatchlayer_signals.evaluator import evaluate_signal_events, rank_signal_events
from dispatchlayer_signals.signal_event import ThresholdState

logger = logging.getLogger(__name__)
router = APIRouter(tags=["signals"])


class SignalEvaluateRequest(BaseModel):
    assets: list[dict]


@router.post("/signals/evaluate")
async def evaluate(req: SignalEvaluateRequest) -> dict:
    deviation_events = []
    ts = datetime.now(timezone.utc)

    for asset in req.assets:
        try:
            asset_type = AssetType(asset.get("asset_type", "wind_turbine"))
        except ValueError:
            continue

        if asset.get("output_kw") is None:
            continue

        telemetry = AssetTelemetry(
            timestamp_utc=ts,
            asset_id=asset["asset_id"],
            site_id=asset.get("site_id", ""),
            asset_type=asset_type,
            output_kw=asset["output_kw"],
            capacity_kw=asset.get("capacity_kw", 1000.0),
            curtailment_flag=asset.get("curtailment_flag", False),
        )
        weather = WeatherSample(
            timestamp_utc=ts,
            temperature_c=asset.get("temperature_c"),
            wind_speed_mps=asset.get("wind_speed_mps"),
            wind_direction_deg=None,
            cloud_cover_pct=None,
            shortwave_radiation_wm2=asset.get("ghi_wm2"),
            direct_radiation_wm2=None,
            diffuse_radiation_wm2=None,
            source="api_request",
        )
        event = detect_anomaly(telemetry, weather)
        if event:
            deviation_events.append(event)

    signal_events = evaluate_signal_events(deviation_events)
    ranked = rank_signal_events(signal_events)

    return {
        "event_count": len(ranked),
        "events": [
            {
                "signal_id":      e.signal_id,
                "timestamp_utc":  e.timestamp_utc,
                "source":         e.source,
                "channel":        e.channel,
                "metric":         e.metric,
                "observed_value": e.observed_value,
                "expected_value": e.expected_value,
                "delta":          e.delta,
                "unit":           e.unit,
                "state":          e.state.value,
                "audit_hash":     e.audit_hash,
            }
            for e in ranked
        ],
    }


@router.get("/signals/states")
async def list_states() -> dict:
    return {"states": [s.value for s in ThresholdState]}
