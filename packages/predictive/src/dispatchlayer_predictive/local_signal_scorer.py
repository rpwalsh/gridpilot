"""
L Layer — Local Signal Scorer

Implements the typed temporal scoring operator for renewable-energy interactions.

The core primitive scores an interaction between two typed entities weighted by
how recently it occurred and a type-pair-specific decay rate:

    score(e, τ, τ', Δt) = W_{τ,τ'} · h · exp(-λ_{τ,τ'} · Δt)

where:
  - τ, τ' are the ordered entity type pair (e.g. weather_cell → asset)
  - W_{τ,τ'} is the type-pair-specific weight matrix (simplified to scalar here)
  - h is the local feature vector of the interaction
  - λ_{τ,τ'} is the type-pair-specific decay rate (faster decay = shorter memory)
  - Δt is elapsed time in hours since the interaction was observed

Typed entity classes in the renewable domain:
  weather_cell, asset, grid_region, market_node, sensor, forecast_model, site

Typed interaction edges:
  weather_affects_asset, weather_affects_site, asset_feeds_grid_region,
  site_exposed_to_weather_cell, battery_offsets_peak_demand,
  maintenance_event_changes_asset_health, forecast_disagrees_with_observation,
  market_price_affects_dispatch, sensor_reports_asset_state

Removing type-pair indexing collapses to uniform decay and loses the ability to
distinguish, say, a stale market signal from a stale weather observation — they
decay on very different timescales in operations.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class EntityType(str, Enum):
    WEATHER_CELL = "weather_cell"
    ASSET = "asset"
    SITE = "site"
    GRID_REGION = "grid_region"
    MARKET_NODE = "market_node"
    SENSOR = "sensor"
    FORECAST_MODEL = "forecast_model"
    BATTERY = "battery"
    MAINTENANCE_EVENT = "maintenance_event"


class InteractionType(str, Enum):
    WEATHER_AFFECTS_ASSET = "weather_affects_asset"
    WEATHER_AFFECTS_SITE = "weather_affects_site"
    ASSET_FEEDS_GRID_REGION = "asset_feeds_grid_region"
    SITE_EXPOSED_TO_WEATHER = "site_exposed_to_weather_cell"
    BATTERY_OFFSETS_PEAK = "battery_offsets_peak_demand"
    MAINTENANCE_CHANGES_ASSET = "maintenance_event_changes_asset_health"
    FORECAST_DISAGREES_OBSERVATION = "forecast_disagrees_with_observation"
    MARKET_AFFECTS_DISPATCH = "market_price_affects_dispatch"
    SENSOR_REPORTS_ASSET = "sensor_reports_asset_state"


# Type-pair-specific decay rates (λ in hours⁻¹).
# Higher λ = faster decay = shorter operational memory for this interaction type.
# Weather signals over assets decay quickly (hours matter).
# Maintenance history decays slowly (weeks of relevance).
_DECAY_RATES: dict[InteractionType, float] = {
    InteractionType.WEATHER_AFFECTS_ASSET: 0.20,       # ~5h half-life
    InteractionType.WEATHER_AFFECTS_SITE: 0.20,        # ~5h half-life
    InteractionType.ASSET_FEEDS_GRID_REGION: 0.15,     # ~7h half-life
    InteractionType.SITE_EXPOSED_TO_WEATHER: 0.20,     # ~5h half-life
    InteractionType.BATTERY_OFFSETS_PEAK: 0.30,        # ~3.3h — market windows are short
    InteractionType.MAINTENANCE_CHANGES_ASSET: 0.005,  # ~140h — maintenance context persists
    InteractionType.FORECAST_DISAGREES_OBSERVATION: 0.25,  # ~4h — reconcile fresh
    InteractionType.MARKET_AFFECTS_DISPATCH: 0.35,     # ~2.8h — market signals are ephemeral
    InteractionType.SENSOR_REPORTS_ASSET: 0.12,        # ~8h half-life
}

# Type-pair-specific base weights (W_{τ,τ'}).
# Reflects operational importance of each interaction class.
_BASE_WEIGHTS: dict[InteractionType, float] = {
    InteractionType.WEATHER_AFFECTS_ASSET: 0.85,
    InteractionType.WEATHER_AFFECTS_SITE: 0.80,
    InteractionType.ASSET_FEEDS_GRID_REGION: 0.75,
    InteractionType.SITE_EXPOSED_TO_WEATHER: 0.80,
    InteractionType.BATTERY_OFFSETS_PEAK: 0.90,
    InteractionType.MAINTENANCE_CHANGES_ASSET: 0.70,
    InteractionType.FORECAST_DISAGREES_OBSERVATION: 0.95,  # disagreement is a strong signal
    InteractionType.MARKET_AFFECTS_DISPATCH: 0.85,
    InteractionType.SENSOR_REPORTS_ASSET: 0.70,
}


@dataclass
class ScoredInteraction:
    """A single scored typed interaction between two operational entities."""

    interaction_type: InteractionType
    source_entity_id: str
    target_entity_id: str
    raw_value: float          # The scalar measure of the interaction (e.g. wind speed, price)
    observed_at_utc: datetime
    score: float              # W_{τ,τ'} · raw_value · exp(-λ_{τ,τ'} · Δt)
    temporal_weight: float    # exp(-λ_{τ,τ'} · Δt) alone, for diagnostics
    data_quality: float       # 0–1, source completeness/freshness indicator


@dataclass
class LocalScoreSet:
    """All scored interactions for a single site evaluation pass."""

    site_id: str
    scored_at_utc: datetime
    interactions: list[ScoredInteraction] = field(default_factory=list)

    def by_type(self, t: InteractionType) -> list[ScoredInteraction]:
        return [i for i in self.interactions if i.interaction_type == t]

    def aggregate(self, t: InteractionType) -> float:
        """Sum scores for a given interaction type."""
        return sum(i.score for i in self.by_type(t))

    def overall_data_quality(self) -> float:
        if not self.interactions:
            return 0.0
        return sum(i.data_quality for i in self.interactions) / len(self.interactions)


class LocalSignalScorer:
    """
    L Layer implementation.

    Scores typed temporal interactions between renewable-energy entities.
    Each interaction type has its own decay rate and base weight so that
    the scorer distinguishes between, for example, a 2-hour-old weather
    observation (still relevant) and a 12-hour-old market price (stale).
    """

    def __init__(self, now: Optional[datetime] = None) -> None:
        self._now = now or datetime.now(timezone.utc)

    def _elapsed_hours(self, observed_at: datetime) -> float:
        ts = observed_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return max(0.0, (self._now - ts).total_seconds() / 3600.0)

    def score(
        self,
        interaction_type: InteractionType,
        source_id: str,
        target_id: str,
        raw_value: float,
        observed_at_utc: datetime,
        data_quality: float = 1.0,
    ) -> ScoredInteraction:
        """Score a single typed interaction."""
        lam = _DECAY_RATES.get(interaction_type, 0.15)
        w = _BASE_WEIGHTS.get(interaction_type, 0.75)
        delta_t = self._elapsed_hours(observed_at_utc)
        temporal_weight = math.exp(-lam * delta_t)
        score_value = w * raw_value * temporal_weight * data_quality
        return ScoredInteraction(
            interaction_type=interaction_type,
            source_entity_id=source_id,
            target_entity_id=target_id,
            raw_value=raw_value,
            observed_at_utc=observed_at_utc,
            score=score_value,
            temporal_weight=temporal_weight,
            data_quality=data_quality,
        )

    def score_site_context(
        self,
        site_id: str,
        *,
        wind_speed_mps: Optional[float] = None,
        wind_observed_at: Optional[datetime] = None,
        ghi_wm2: Optional[float] = None,
        solar_observed_at: Optional[datetime] = None,
        grid_demand_mw: Optional[float] = None,
        grid_observed_at: Optional[datetime] = None,
        market_price_mwh: Optional[float] = None,
        market_observed_at: Optional[datetime] = None,
        forecast_residual_pct: Optional[float] = None,
        residual_observed_at: Optional[datetime] = None,
        battery_soc_pct: Optional[float] = None,
        battery_observed_at: Optional[datetime] = None,
    ) -> LocalScoreSet:
        """
        Convenience method: score all available signals for a site in one call.
        Returns a LocalScoreSet ready to pass to the G layer.
        """
        scored = LocalScoreSet(site_id=site_id, scored_at_utc=self._now)
        ref = self._now

        if wind_speed_mps is not None and wind_observed_at is not None:
            scored.interactions.append(self.score(
                InteractionType.WEATHER_AFFECTS_SITE,
                "weather_cell", site_id,
                raw_value=wind_speed_mps / 25.0,  # normalise to [0,1] at cut-out
                observed_at_utc=wind_observed_at,
            ))

        if ghi_wm2 is not None and solar_observed_at is not None:
            scored.interactions.append(self.score(
                InteractionType.WEATHER_AFFECTS_SITE,
                "solar_resource", site_id,
                raw_value=ghi_wm2 / 1000.0,  # normalise to [0,1] at ~peak
                observed_at_utc=solar_observed_at,
            ))

        if grid_demand_mw is not None and grid_observed_at is not None:
            scored.interactions.append(self.score(
                InteractionType.ASSET_FEEDS_GRID_REGION,
                site_id, "grid_region",
                raw_value=min(grid_demand_mw / 50_000.0, 1.0),
                observed_at_utc=grid_observed_at,
            ))

        if market_price_mwh is not None and market_observed_at is not None:
            scored.interactions.append(self.score(
                InteractionType.MARKET_AFFECTS_DISPATCH,
                "market_node", site_id,
                raw_value=min(market_price_mwh / 200.0, 1.0),
                observed_at_utc=market_observed_at,
            ))

        if forecast_residual_pct is not None and residual_observed_at is not None:
            scored.interactions.append(self.score(
                InteractionType.FORECAST_DISAGREES_OBSERVATION,
                "forecast_model", site_id,
                raw_value=min(abs(forecast_residual_pct) / 50.0, 1.0),
                observed_at_utc=residual_observed_at,
            ))

        if battery_soc_pct is not None and battery_observed_at is not None:
            scored.interactions.append(self.score(
                InteractionType.BATTERY_OFFSETS_PEAK,
                "battery", site_id,
                raw_value=battery_soc_pct / 100.0,
                observed_at_utc=battery_observed_at,
            ))

        return scored
