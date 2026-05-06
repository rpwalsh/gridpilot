# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
from dataclasses import dataclass
import statistics
import math


@dataclass
class ForecastBounds:
    p10: float
    p50: float
    p90: float
    uncertainty_score: float


def compute_forecast_bounds(
    point_forecast: float,
    historical_errors: list[float] | None = None,
    uncertainty_factors: dict[str, float] | None = None,
) -> ForecastBounds:
    """Compute p10/p50/p90 bounds from historical error distribution and uncertainty signals."""
    base_spread_pct = 0.15

    if historical_errors and len(historical_errors) >= 5:
        std_err = statistics.stdev(historical_errors)
        relative_std = std_err / max(abs(point_forecast), 1.0)
        base_spread_pct = max(0.05, min(0.5, relative_std * 1.5))

    extra_uncertainty = 0.0
    if uncertainty_factors:
        for factor_value in uncertainty_factors.values():
            extra_uncertainty += factor_value * 0.05

    total_spread_pct = base_spread_pct + extra_uncertainty
    sigma = point_forecast * total_spread_pct
    p50 = point_forecast
    p10 = max(0.0, p50 - 1.28 * sigma)
    p90 = p50 + 1.28 * sigma
    uncertainty_score = min(1.0, total_spread_pct / 0.5)

    return ForecastBounds(p10=p10, p50=p50, p90=p90, uncertainty_score=uncertainty_score)
