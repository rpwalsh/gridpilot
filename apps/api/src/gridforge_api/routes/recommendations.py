from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone
import logging

from gridforge_domain.models import AssetTelemetry, WeatherSample, AssetType
from gridforge_anomaly.detector import detect_anomaly
from gridforge_recommendations.engine import generate_recommendations, RecommendationType
from gridforge_recommendations.ranking import rank_recommendations

logger = logging.getLogger(__name__)
router = APIRouter(tags=["recommendations"])


class RecommendationRequest(BaseModel):
    assets: list[dict]
    price_per_mwh: float = 50.0


@router.post("/recommendations/generate")
async def generate(req: RecommendationRequest) -> dict:
    findings = []
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
        finding = detect_anomaly(telemetry, weather)
        if finding:
            findings.append(finding)

    recs = generate_recommendations(findings, price_per_mwh=req.price_per_mwh)
    ranked = rank_recommendations(recs)

    return {
        "recommendation_count": len(ranked),
        "recommendations": [
            {
                "recommendation_id": r.recommendation_id,
                "type": r.rec_type.value,
                "asset_id": r.asset_id,
                "site_id": r.site_id,
                "title": r.title,
                "description": r.description,
                "urgency": r.urgency,
                "confidence": r.confidence,
                "estimated_value_usd": r.estimated_value_usd,
                "action_steps": r.action_steps,
                "decision_trace": r.decision_trace.to_dict(),
            }
            for r in ranked
        ],
    }


@router.get("/recommendations/types")
async def list_types() -> dict:
    return {"types": [t.value for t in RecommendationType]}
