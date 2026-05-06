from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import logging

from dispatchlayer_forecasting.wind_power_curve import wind_power_output_kw
from dispatchlayer_forecasting.solar_irradiance_model import solar_output_kw
from dispatchlayer_forecasting.portfolio_forecast import SiteForecast, aggregate_portfolio_forecast
from dispatchlayer_predictive.forecast_bounds import compute_forecast_bounds
from dispatchlayer_predictive.decision_trace import DecisionTrace

logger = logging.getLogger(__name__)
router = APIRouter(tags=["forecasts"])


class SiteForecastRequest(BaseModel):
    site_id: str
    asset_type: str
    capacity_kw: float
    wind_speed_mps: Optional[float] = None
    ghi_wm2: Optional[float] = None
    temperature_c: Optional[float] = 20.0
    historical_errors: Optional[list[float]] = None


class PortfolioForecastRequest(BaseModel):
    portfolio_id: str
    window_hours: int = 24
    sites: list[SiteForecastRequest]


@router.post("/forecasts/site")
async def forecast_site(req: SiteForecastRequest) -> dict:
    trace = DecisionTrace(model_versions={"forecasting": "0.1.0", "predictive_core": "0.1.0"})

    if req.asset_type == "wind_turbine" and req.wind_speed_mps is not None:
        point_forecast = wind_power_output_kw(req.wind_speed_mps, req.capacity_kw)
        trace.add_step(
            "wind_power_curve",
            inputs={"wind_speed_mps": req.wind_speed_mps, "capacity_kw": req.capacity_kw},
            output=point_forecast,
            reasoning="Applied polynomial wind power curve (cut-in 3 m/s, rated 12 m/s, cut-out 25 m/s)",
        )
    elif req.asset_type == "solar_inverter" and req.ghi_wm2 is not None:
        point_forecast = solar_output_kw(req.ghi_wm2, req.temperature_c or 20.0, req.capacity_kw)
        trace.add_step(
            "solar_irradiance_model",
            inputs={"ghi_wm2": req.ghi_wm2, "temperature_c": req.temperature_c, "capacity_kw": req.capacity_kw},
            output=point_forecast,
            reasoning="Applied PVWatts-style irradiance model with temperature derating",
        )
    else:
        return {"error": "Insufficient inputs for forecast", "decision_trace": trace.to_dict()}

    bounds = compute_forecast_bounds(point_forecast, req.historical_errors)
    trace.add_step(
        "forecast_bounds",
        inputs={"point_forecast": point_forecast},
        output={"p10": bounds.p10, "p50": bounds.p50, "p90": bounds.p90},
        reasoning=f"Computed p10/p50/p90 with {bounds.uncertainty_score:.2f} uncertainty score",
    )

    return {
        "site_id": req.site_id,
        "asset_type": req.asset_type,
        "p10_kw": bounds.p10,
        "p50_kw": bounds.p50,
        "p90_kw": bounds.p90,
        "uncertainty_score": bounds.uncertainty_score,
        "decision_trace": trace.to_dict(),
    }


@router.post("/forecasts/portfolio")
async def forecast_portfolio(req: PortfolioForecastRequest) -> dict:
    site_forecasts: list[SiteForecast] = []
    all_traces = []

    for site_req in req.sites:
        resp = await forecast_site(site_req)
        if "error" not in resp:
            site_forecasts.append(SiteForecast(
                site_id=site_req.site_id,
                asset_type=site_req.asset_type,
                p10_kw=resp["p10_kw"],
                p50_kw=resp["p50_kw"],
                p90_kw=resp["p90_kw"],
                uncertainty_score=resp["uncertainty_score"],
                basis=["weather_forecast"],
            ))
            all_traces.append(resp.get("decision_trace"))

    result = aggregate_portfolio_forecast(req.portfolio_id, site_forecasts, req.window_hours)
    return {
        "portfolio_id": result.portfolio_id,
        "window_hours": result.window_hours,
        "p10_mwh": result.p10_mwh,
        "p50_mwh": result.p50_mwh,
        "p90_mwh": result.p90_mwh,
        "total_capacity_mw": result.total_capacity_mw,
        "portfolio_uncertainty_score": result.portfolio_uncertainty_score,
        "site_count": len(site_forecasts),
        "site_traces": all_traces,
    }
