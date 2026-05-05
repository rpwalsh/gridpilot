from fastapi import APIRouter
from pydantic import BaseModel
import logging

from gridforge_dispatch.battery_optimizer import optimize_dispatch

logger = logging.getLogger(__name__)
router = APIRouter(tags=["dispatch"])


class DispatchRequest(BaseModel):
    battery_id: str
    current_soc_pct: float
    capacity_kwh: float
    forecast_solar_kw: float = 0.0
    forecast_demand_kw: float = 0.0
    price_per_mwh: float = 50.0
    window_hours: int = 4


@router.post("/dispatch/optimize")
async def optimize(req: DispatchRequest) -> dict:
    result = optimize_dispatch(
        battery_id=req.battery_id,
        current_soc_pct=req.current_soc_pct,
        capacity_kwh=req.capacity_kwh,
        forecast_solar_kw=req.forecast_solar_kw,
        forecast_demand_kw=req.forecast_demand_kw,
        price_per_mwh=req.price_per_mwh,
        window_hours=req.window_hours,
    )
    return {
        "battery_id": result.battery_id,
        "action": result.action.value,
        "window_hours": result.window_hours,
        "reasoning": result.reasoning,
        "estimated_value_usd": result.estimated_value_usd,
        "net_value_usd": result.net_value_usd,
        "current_soc_pct": result.current_soc_pct,
        "target_soc_pct": result.target_soc_pct,
        "decision_trace": result.decision_trace.to_dict(),
    }
