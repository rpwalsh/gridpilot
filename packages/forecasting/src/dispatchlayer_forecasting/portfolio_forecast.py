# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
import math
from dataclasses import dataclass
from dispatchlayer_predictive.forecast_bounds import compute_forecast_bounds


@dataclass
class SiteForecast:
    site_id: str
    asset_type: str
    p10_kw: float
    p50_kw: float
    p90_kw: float
    uncertainty_score: float
    basis: list[str]


@dataclass
class PortfolioForecastResult:
    portfolio_id: str
    window_hours: int
    sites: list[SiteForecast]
    p10_mwh: float
    p50_mwh: float
    p90_mwh: float
    total_capacity_mw: float
    portfolio_uncertainty_score: float


def aggregate_portfolio_forecast(
    portfolio_id: str,
    site_forecasts: list[SiteForecast],
    window_hours: int,
) -> PortfolioForecastResult:
    """Aggregate site-level forecasts into a portfolio summary with p10/p50/p90 bounds."""
    if not site_forecasts:
        return PortfolioForecastResult(
            portfolio_id=portfolio_id,
            window_hours=window_hours,
            sites=[],
            p10_mwh=0.0,
            p50_mwh=0.0,
            p90_mwh=0.0,
            total_capacity_mw=0.0,
            portfolio_uncertainty_score=0.0,
        )

    total_p50_kw = sum(s.p50_kw for s in site_forecasts)
    sum_p10_spread_sq = sum((s.p50_kw - s.p10_kw) ** 2 for s in site_forecasts)
    sum_p90_spread_sq = sum((s.p90_kw - s.p50_kw) ** 2 for s in site_forecasts)

    portfolio_p10_spread = math.sqrt(sum_p10_spread_sq)
    portfolio_p90_spread = math.sqrt(sum_p90_spread_sq)

    portfolio_p10_kw = max(0.0, total_p50_kw - portfolio_p10_spread)
    portfolio_p90_kw = total_p50_kw + portfolio_p90_spread

    p50_mwh = (total_p50_kw / 1000.0) * window_hours
    p10_mwh = (portfolio_p10_kw / 1000.0) * window_hours
    p90_mwh = (portfolio_p90_kw / 1000.0) * window_hours

    avg_uncertainty = sum(s.uncertainty_score for s in site_forecasts) / len(site_forecasts)

    return PortfolioForecastResult(
        portfolio_id=portfolio_id,
        window_hours=window_hours,
        sites=site_forecasts,
        p10_mwh=p10_mwh,
        p50_mwh=p50_mwh,
        p90_mwh=p90_mwh,
        total_capacity_mw=total_p50_kw / 1000.0,
        portfolio_uncertainty_score=avg_uncertainty,
    )
