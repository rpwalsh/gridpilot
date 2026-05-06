# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
P Layer  Predictive Evolution Engine

Takes a PortfolioState (from the G layer) and propagates it forward across a
forecast window, producing a PredictedState with explicit confidence intervals.

The uncertainty decomposition follows the three-term error bound pattern:

    total_error  _G (structural) + _P (predictive) + _obs (observational)

- _G:   How well the structural state captures the current situation.
         Degrades when data quality is low or forecast disagreement is high.
- _P:   How reliably the predictive model extrapolates over this horizon.
         Degrades with longer horizons, weather volatility, and regime transitions.
- _obs: Irreducible noise from measurement uncertainty in the source data.

The three-term decomposition is what drives the ForecastTrustScore: rather than
reporting a single opaque confidence number, we tell operators which term is
contributing most to uncertainty so they know where to focus attention.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from .portfolio_state_builder import PortfolioState, SiteState


@dataclass
class SitePrediction:
    """P-layer prediction for a single site."""

    site_id: str
    asset_type: str
    capacity_mw: float
    window_hours: int

    # Expected generation
    expected_generation_mwh: float
    p10_generation_mwh: float   # pessimistic bound
    p50_generation_mwh: float   # central estimate
    p90_generation_mwh: float   # optimistic bound

    # Error decomposition  the three actionable terms
    structural_error: float     # G: state quality contribution to uncertainty
    predictive_error: float     # P: model horizon contribution
    observational_noise: float  # obs: irreducible measurement floor

    # Derived trust score
    forecast_trust: float       # 1  (G + P + obs), capped [0.1, 0.97]

    risk_factors: list[str] = field(default_factory=list)


@dataclass
class PortfolioPrediction:
    """P-layer prediction aggregated across the full portfolio."""

    portfolio_id: str
    window_hours: int
    site_predictions: list[SitePrediction] = field(default_factory=list)

    total_expected_mwh: float = 0.0
    total_p10_mwh: float = 0.0
    total_p90_mwh: float = 0.0

    # Portfolio-level error decomposition
    structural_error: float = 0.0
    predictive_error: float = 0.0
    observational_noise: float = 0.0
    forecast_trust: float = 0.0

    primary_risk_factors: list[str] = field(default_factory=list)
    predicted_at_utc: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class PredictiveEvolutionEngine:
    """
    P Layer implementation.

    Propagates structural site/portfolio state forward in time, producing
    generation forecasts with explicit confidence intervals and a three-term
    error decomposition.
    """

    # Predictive error grows with forecast horizon.
    # ~2% per hour for the first 12h, flattening toward 30% at 72h.
    _HORIZON_ERROR_COEFFICIENTS = [(12, 0.02), (24, 0.015), (48, 0.008), (72, 0.004)]

    def _predictive_error_for_horizon(self, window_hours: int) -> float:
        """_P component: accumulate horizon error up to window_hours."""
        error = 0.0
        remaining = window_hours
        for (band_hours, rate) in self._HORIZON_ERROR_COEFFICIENTS:
            band = min(remaining, band_hours)
            error += band * rate
            remaining -= band
            if remaining <= 0:
                break
        if remaining > 0:
            error += remaining * 0.002
        return min(error, 0.40)

    def predict_site(
        self,
        site_state: SiteState,
        window_hours: int,
        *,
        price_per_mwh: float = 45.0,
    ) -> SitePrediction:
        # Base generation estimate from capacity factor
        cf = site_state.capacity_factor_estimate
        cf = max(0.0, cf * (1.0 - site_state.derating_risk * 0.5))
        expected_mwh = site_state.capacity_mw * cf * window_hours

        # Error decomposition
        eps_g = site_state.data_quality and site_state.forecast_disagreement_score or 0.0
        eps_g = min(site_state.structural_error_proxy(), 0.40)
        eps_p = self._predictive_error_for_horizon(window_hours)
        eps_obs = site_state.observational_noise

        total_error = min(eps_g + eps_p + eps_obs, 0.80)
        trust = max(0.10, min(0.97, 1.0 - total_error))

        # Spread around p50
        sigma = expected_mwh * total_error * 0.5
        p10 = max(0.0, expected_mwh - 1.28 * sigma)
        p90 = expected_mwh + 1.28 * sigma

        risk_factors: list[str] = []
        if eps_g > 0.15:
            risk_factors.append("forecast disagreement degrades structural state quality")
        if eps_p > 0.20:
            risk_factors.append(f"long forecast horizon ({window_hours}h) increases predictive error")
        if site_state.derating_risk > 0.4:
            risk_factors.append(f"derating risk elevated ({site_state.derating_risk:.0%})")
        if site_state.weather_score < 0.2:
            risk_factors.append("weather signal weak or stale")
        if site_state.data_quality < 0.5:
            risk_factors.append("source data quality below threshold")

        return SitePrediction(
            site_id=site_state.site_id,
            asset_type=site_state.asset_type,
            capacity_mw=site_state.capacity_mw,
            window_hours=window_hours,
            expected_generation_mwh=round(expected_mwh, 2),
            p10_generation_mwh=round(p10, 2),
            p50_generation_mwh=round(expected_mwh, 2),
            p90_generation_mwh=round(p90, 2),
            structural_error=round(eps_g, 4),
            predictive_error=round(eps_p, 4),
            observational_noise=round(eps_obs, 4),
            forecast_trust=round(trust, 3),
            risk_factors=risk_factors,
        )

    def predict_portfolio(
        self,
        portfolio_state: PortfolioState,
        window_hours: int,
    ) -> PortfolioPrediction:
        site_preds = [self.predict_site(s, window_hours) for s in portfolio_state.sites]

        total_mwh = sum(p.expected_generation_mwh for p in site_preds)
        total_p10 = sum(p.p10_generation_mwh for p in site_preds)
        total_p90 = sum(p.p90_generation_mwh for p in site_preds)

        # Portfolio-level error terms: weighted average across sites
        n = len(site_preds)
        if n:
            eps_g = sum(p.structural_error for p in site_preds) / n
            eps_p = sum(p.predictive_error for p in site_preds) / n
            eps_obs = sum(p.observational_noise for p in site_preds) / n
        else:
            eps_g = eps_p = eps_obs = 0.0

        trust = max(0.10, min(0.97, 1.0 - min(eps_g + eps_p + eps_obs, 0.80)))

        # Aggregate risk factors (deduplicated)
        risk_set: set[str] = set()
        for p in site_preds:
            risk_set.update(p.risk_factors)

        return PortfolioPrediction(
            portfolio_id=portfolio_state.portfolio_id,
            window_hours=window_hours,
            site_predictions=site_preds,
            total_expected_mwh=round(total_mwh, 2),
            total_p10_mwh=round(total_p10, 2),
            total_p90_mwh=round(total_p90, 2),
            structural_error=round(eps_g, 4),
            predictive_error=round(eps_p, 4),
            observational_noise=round(eps_obs, 4),
            forecast_trust=round(trust, 3),
            primary_risk_factors=sorted(risk_set),
        )


# Attach helper method to SiteState to avoid circular import
def _site_state_structural_error_proxy(self: SiteState) -> float:
    """G for one site: degrades with low data quality and high forecast disagreement."""
    quality_penalty = 1.0 - self.data_quality
    return min(1.0, quality_penalty * 0.6 + self.forecast_disagreement_score * 0.4)


SiteState.structural_error_proxy = _site_state_structural_error_proxy  # type: ignore[attr-defined]

