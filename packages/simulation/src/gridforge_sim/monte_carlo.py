from __future__ import annotations
import random
import statistics
from dataclasses import dataclass

from gridforge_forecasting.wind_power_curve import wind_power_output_kw
from gridforge_forecasting.solar_irradiance_model import solar_output_kw
from gridforge_predictive.forecast_bounds import compute_forecast_bounds, ForecastBounds


@dataclass
class MonteCarloResult:
    portfolio_id: str
    iterations: int
    p10_mwh: float
    p50_mwh: float
    p90_mwh: float
    mean_mwh: float
    std_mwh: float
    uncertainty_score: float


def run_monte_carlo_simulation(
    portfolio_id: str,
    wind_sites: list[dict],
    solar_sites: list[dict],
    wind_speed_mean: float,
    wind_speed_std: float,
    ghi_mean: float,
    ghi_std: float,
    temperature_mean: float,
    window_hours: int = 24,
    iterations: int = 1000,
    seed: int | None = None,
) -> MonteCarloResult:
    """Run Monte Carlo simulation for portfolio generation over a time window."""
    rng = random.Random(seed)
    total_outputs: list[float] = []

    for _ in range(iterations):
        iteration_total_kw = 0.0

        for site in wind_sites:
            ws = max(0.0, rng.gauss(wind_speed_mean, wind_speed_std))
            kw = wind_power_output_kw(ws, site["capacity_kw"])
            iteration_total_kw += kw

        for site in solar_sites:
            ghi = max(0.0, rng.gauss(ghi_mean, ghi_std))
            temp = rng.gauss(temperature_mean, 3.0)
            kw = solar_output_kw(ghi, temp, site["capacity_kw"])
            iteration_total_kw += kw

        mwh = (iteration_total_kw / 1000.0) * window_hours
        total_outputs.append(mwh)

    total_outputs.sort()
    n = len(total_outputs)
    p10 = total_outputs[int(n * 0.10)]
    p50 = total_outputs[int(n * 0.50)]
    p90 = total_outputs[int(n * 0.90)]
    mean_val = statistics.mean(total_outputs)
    std_val = statistics.stdev(total_outputs)
    uncertainty_score = min(1.0, std_val / max(mean_val, 1.0))

    return MonteCarloResult(
        portfolio_id=portfolio_id,
        iterations=iterations,
        p10_mwh=p10,
        p50_mwh=p50,
        p90_mwh=p90,
        mean_mwh=mean_val,
        std_mwh=std_val,
        uncertainty_score=uncertainty_score,
    )
