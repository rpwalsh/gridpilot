"""
G Layer — Portfolio State Builder

Compresses the scored local interactions (from the L layer) into a finite-
dimensional site-level and portfolio-level structural state.

Structural state is the object on which the P layer (predictive evolution) and
D layer (decision ranking) can operate efficiently.  It captures:

  - aggregate signal strength per interaction type
  - data quality (how complete and fresh are the sources?)
  - site-level summary statistics (capacity factor proxy, derating risk, etc.)
  - portfolio-level roll-up across sites

The G layer is deliberately lossy: it discards raw provider JSON and keeps only
the operationally relevant summary.  This is what prevents external provider
shapes from leaking into the predictive or decision layers.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from .local_signal_scorer import InteractionType, LocalScoreSet


@dataclass
class SiteState:
    """Structural state for a single site, output of the G layer."""

    site_id: str
    asset_type: str                   # "solar" | "wind" | "battery" | "hybrid"
    capacity_mw: float

    # Aggregated signal scores from L layer
    weather_score: float              # 0–1, higher = stronger weather signal present
    grid_score: float                 # 0–1, higher = stronger grid demand context
    market_score: float               # 0–1, higher = stronger price signal
    forecast_disagreement_score: float  # 0–1, higher = larger forecast-vs-actual gap
    battery_readiness_score: float    # 0–1, only for battery/hybrid sites

    # Derived state estimates
    capacity_factor_estimate: float   # 0–1, estimated current CF from weather signals
    derating_risk: float              # 0–1, probability of temperature/condition derating
    data_quality: float               # 0–1, overall quality of source data this pass

    # Observational noise floor: proportion of signal that is irreducible noise
    observational_noise: float        # 0–1

    scored_at_utc: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class PortfolioState:
    """Structural state for the full portfolio, output of the G layer."""

    portfolio_id: str
    sites: list[SiteState] = field(default_factory=list)
    built_at_utc: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def total_capacity_mw(self) -> float:
        return sum(s.capacity_mw for s in self.sites)

    @property
    def mean_data_quality(self) -> float:
        if not self.sites:
            return 0.0
        return sum(s.data_quality for s in self.sites) / len(self.sites)

    @property
    def mean_weather_score(self) -> float:
        if not self.sites:
            return 0.0
        return sum(s.weather_score for s in self.sites) / len(self.sites)

    @property
    def high_disagreement_sites(self) -> list[SiteState]:
        return [s for s in self.sites if s.forecast_disagreement_score > 0.4]

    @property
    def derating_risk_sites(self) -> list[SiteState]:
        return [s for s in self.sites if s.derating_risk > 0.5]

    def structural_error_score(self) -> float:
        """
        Structural error εG: how well does the structural state represent reality?

        Degrades when data quality is low, when many sites have forecast disagreement,
        or when derating risk is elevated.  This is the G-layer term in the predictive
        error decomposition.
        """
        quality_penalty = 1.0 - self.mean_data_quality
        disagreement_fraction = len(self.high_disagreement_sites) / max(len(self.sites), 1)
        derating_fraction = len(self.derating_risk_sites) / max(len(self.sites), 1)
        return min(1.0, quality_penalty * 0.5 + disagreement_fraction * 0.35 + derating_fraction * 0.15)


class PortfolioStateBuilder:
    """
    G Layer implementation.

    Compresses a set of LocalScoreSets (one per site) into a PortfolioState.
    Each SiteState encodes the operationally relevant summary for one site;
    PortfolioState rolls them up.
    """

    def build_site_state(
        self,
        score_set: LocalScoreSet,
        *,
        asset_type: str,
        capacity_mw: float,
        temperature_c: Optional[float] = None,
    ) -> SiteState:
        weather_score = min(1.0, score_set.aggregate(InteractionType.WEATHER_AFFECTS_SITE))
        grid_score = min(1.0, score_set.aggregate(InteractionType.ASSET_FEEDS_GRID_REGION))
        market_score = min(1.0, score_set.aggregate(InteractionType.MARKET_AFFECTS_DISPATCH))
        forecast_disagreement_score = min(1.0, score_set.aggregate(InteractionType.FORECAST_DISAGREES_OBSERVATION))
        battery_readiness_score = min(1.0, score_set.aggregate(InteractionType.BATTERY_OFFSETS_PEAK))

        # Estimate capacity factor from weather signal strength
        if asset_type == "solar":
            capacity_factor_estimate = weather_score * 0.25  # solar CF ~0–25%
        elif asset_type == "wind":
            capacity_factor_estimate = weather_score * 0.40  # wind CF ~0–40%
        else:
            capacity_factor_estimate = weather_score * 0.30

        # Derating risk: elevated temperature for solar, near-zero for icing
        derating_risk = 0.0
        if temperature_c is not None:
            if asset_type == "solar" and temperature_c > 35.0:
                derating_risk = min(1.0, (temperature_c - 35.0) / 20.0)
            elif asset_type == "wind" and -5.0 <= temperature_c <= 2.0:
                derating_risk = 0.6  # icing risk window

        # Observational noise: inverse of data quality with a floor
        data_quality = score_set.overall_data_quality()
        observational_noise = max(0.02, 1.0 - data_quality) * 0.3

        return SiteState(
            site_id=score_set.site_id,
            asset_type=asset_type,
            capacity_mw=capacity_mw,
            weather_score=weather_score,
            grid_score=grid_score,
            market_score=market_score,
            forecast_disagreement_score=forecast_disagreement_score,
            battery_readiness_score=battery_readiness_score,
            capacity_factor_estimate=capacity_factor_estimate,
            derating_risk=derating_risk,
            data_quality=data_quality,
            observational_noise=observational_noise,
            scored_at_utc=score_set.scored_at_utc,
        )

    def build_portfolio_state(
        self,
        portfolio_id: str,
        site_states: list[SiteState],
    ) -> PortfolioState:
        return PortfolioState(
            portfolio_id=portfolio_id,
            sites=site_states,
        )
