"""
D Layer — Decision Ranker

Takes a predicted state (from the P layer) and ranks operational recommendations
by their expected value to the operator.

Ranking formula:

    recommendation_score =
        evidence_strength
        × confidence
        × operational_urgency
        × financial_impact_normalized
        × constraint_validity

This is not a black box.  Every score is constructed from named evidence signals
and the full construction is written into the audit trace so an operator can
inspect and challenge any recommendation.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from .predictive_evolution import SitePrediction, PortfolioPrediction


class RecommendationType(str, Enum):
    DISPATCH_BATTERY = "dispatch_battery"
    HOLD_BATTERY = "hold_battery_reserve"
    INSPECT_ASSET = "inspect_asset"
    REFORECAST = "reforecast_portfolio"
    REVIEW_CURTAILMENT = "review_curtailment_flag"
    REVIEW_DATA_QUALITY = "review_data_quality"
    MONITOR = "monitor_only"
    DELAY_MAINTENANCE = "delay_maintenance"
    ADVANCE_MAINTENANCE = "advance_maintenance"


class Priority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


@dataclass
class RankedRecommendation:
    """A single ranked operational recommendation from the D layer."""

    recommendation_id: str
    recommendation_type: RecommendationType
    priority: Priority
    site_id: Optional[str]
    action: str
    why_now: str
    evidence: list[str]
    confidence: float
    urgency_hours: Optional[float]          # Act within this many hours; None = flexible
    estimated_value_usd: Optional[float]
    risk_if_ignored: Optional[str]
    recommendation_score: float             # composite ranking score
    audit_trace_id: str


@dataclass
class DecisionSet:
    """Full output of the D layer for one evaluation pass."""

    portfolio_id: str
    site_id: Optional[str]
    recommendations: list[RankedRecommendation] = field(default_factory=list)
    ranked_at_utc: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def top(self) -> Optional[RankedRecommendation]:
        return self.recommendations[0] if self.recommendations else None

    def by_priority(self, priority: Priority) -> list[RankedRecommendation]:
        return [r for r in self.recommendations if r.priority == priority]


class DecisionRanker:
    """
    D Layer implementation.

    Produces ranked recommendations from site and portfolio predictions.
    Each recommendation is scored, evidence-backed, and linked to an audit trace.
    """

    def __init__(self, price_per_mwh: float = 45.0) -> None:
        self._price_per_mwh = price_per_mwh

    def _make_id(self, prefix: str) -> str:
        from datetime import datetime
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        import random
        return f"{prefix}_{ts}_{random.randint(1000, 9999)}"

    def _composite_score(
        self,
        evidence_strength: float,
        confidence: float,
        urgency: float,          # 0–1, 1 = act now
        financial_impact: float, # 0–1 normalised
        constraint_valid: float = 1.0,
    ) -> float:
        return min(1.0, evidence_strength * confidence * urgency * financial_impact * constraint_valid)

    def rank_site(
        self,
        prediction: SitePrediction,
        *,
        has_battery: bool = False,
        current_soc_pct: Optional[float] = None,
        forecast_residual_pct: Optional[float] = None,
    ) -> DecisionSet:
        recs: list[RankedRecommendation] = []
        trace_id = self._make_id("trace")

        trust = prediction.forecast_trust
        eps_g = prediction.structural_error
        eps_p = prediction.predictive_error

        # --- Forecast trust too low → recommend reforecast
        if trust < 0.55:
            dominant_term = "structural" if eps_g >= eps_p else "predictive"
            score = self._composite_score(
                evidence_strength=1.0 - trust,
                confidence=0.90,
                urgency=0.85,
                financial_impact=0.60,
            )
            recs.append(RankedRecommendation(
                recommendation_id=self._make_id("rec"),
                recommendation_type=RecommendationType.REFORECAST,
                priority=Priority.HIGH,
                site_id=prediction.site_id,
                action="Refresh forecast before dispatch planning.",
                why_now=f"Forecast trust score is {trust:.0%}. Dominant error term: {dominant_term}.",
                evidence=[
                    f"structural error: {eps_g:.0%}",
                    f"predictive error: {eps_p:.0%}",
                    f"observational noise: {prediction.observational_noise:.0%}",
                ],
                confidence=0.88,
                urgency_hours=2.0,
                estimated_value_usd=None,
                risk_if_ignored="Dispatch decisions based on untrusted forecast may miss peak window.",
                recommendation_score=round(score, 4),
                audit_trace_id=trace_id,
            ))

        # --- Data quality degraded → review sources
        if prediction.observational_noise > 0.10 or eps_g > 0.25:
            score = self._composite_score(
                evidence_strength=max(eps_g, prediction.observational_noise),
                confidence=0.80,
                urgency=0.65,
                financial_impact=0.50,
            )
            recs.append(RankedRecommendation(
                recommendation_id=self._make_id("rec"),
                recommendation_type=RecommendationType.REVIEW_DATA_QUALITY,
                priority=Priority.MEDIUM,
                site_id=prediction.site_id,
                action="Verify weather and telemetry source freshness.",
                why_now="Elevated observational noise or structural error detected.",
                evidence=[f"observational noise: {prediction.observational_noise:.0%}",
                          f"structural error: {eps_g:.0%}"],
                confidence=0.75,
                urgency_hours=4.0,
                estimated_value_usd=None,
                risk_if_ignored="Stale or missing data will degrade all downstream forecasts.",
                recommendation_score=round(score, 4),
                audit_trace_id=trace_id,
            ))

        # --- Battery dispatch if applicable
        if has_battery and current_soc_pct is not None:
            self._add_battery_recommendations(recs, prediction, current_soc_pct, trace_id)

        # --- Forecast residual anomaly
        if forecast_residual_pct is not None and abs(forecast_residual_pct) > 20.0:
            direction = "under" if forecast_residual_pct < 0 else "over"
            score = self._composite_score(
                evidence_strength=min(abs(forecast_residual_pct) / 50.0, 1.0),
                confidence=0.82,
                urgency=0.75,
                financial_impact=0.70,
            )
            recs.append(RankedRecommendation(
                recommendation_id=self._make_id("rec"),
                recommendation_type=RecommendationType.INSPECT_ASSET,
                priority=Priority.HIGH if abs(forecast_residual_pct) > 30 else Priority.MEDIUM,
                site_id=prediction.site_id,
                action=f"Investigate {direction}production: {abs(forecast_residual_pct):.1f}% from expected.",
                why_now="Significant forecast residual detected. Cause may be asset, weather, or sensor.",
                evidence=[f"forecast residual: {forecast_residual_pct:+.1f}%",
                          f"trust score: {trust:.0%}"],
                confidence=0.82,
                urgency_hours=6.0,
                estimated_value_usd=abs(forecast_residual_pct / 100)
                    * prediction.expected_generation_mwh * self._price_per_mwh,
                risk_if_ignored="Unresolved underperformance compounds over operating window.",
                recommendation_score=round(score, 4),
                audit_trace_id=trace_id,
            ))

        # Sort by score descending
        recs.sort(key=lambda r: r.recommendation_score, reverse=True)
        return DecisionSet(
            portfolio_id="",
            site_id=prediction.site_id,
            recommendations=recs,
        )

    def _add_battery_recommendations(
        self,
        recs: list[RankedRecommendation],
        prediction: SitePrediction,
        soc_pct: float,
        trace_id: str,
    ) -> None:
        trust = prediction.forecast_trust
        # High SoC + good weather forecast → likely overgeneration → hold or charge more
        if soc_pct > 75.0 and prediction.expected_generation_mwh > 0:
            score = self._composite_score(
                evidence_strength=soc_pct / 100.0,
                confidence=trust,
                urgency=0.70,
                financial_impact=0.80,
            )
            recs.append(RankedRecommendation(
                recommendation_id=self._make_id("rec"),
                recommendation_type=RecommendationType.HOLD_BATTERY,
                priority=Priority.MEDIUM,
                site_id=prediction.site_id,
                action="Hold battery reserve for evening peak demand window.",
                why_now=f"SoC is {soc_pct:.0f}%. Forecast suggests generation continues.",
                evidence=[f"current SoC: {soc_pct:.0f}%",
                          f"expected generation: {prediction.expected_generation_mwh:.1f} MWh",
                          f"forecast trust: {trust:.0%}"],
                confidence=round(trust * 0.90, 3),
                urgency_hours=None,
                estimated_value_usd=prediction.expected_generation_mwh * self._price_per_mwh * 0.15,
                risk_if_ignored="Premature discharge may miss higher-value evening window.",
                recommendation_score=round(score, 4),
                audit_trace_id=trace_id,
            ))

        # Low SoC + good forecast → charge window
        elif soc_pct < 35.0 and prediction.expected_generation_mwh > 0:
            score = self._composite_score(
                evidence_strength=1.0 - soc_pct / 100.0,
                confidence=trust,
                urgency=0.80,
                financial_impact=0.75,
            )
            recs.append(RankedRecommendation(
                recommendation_id=self._make_id("rec"),
                recommendation_type=RecommendationType.DISPATCH_BATTERY,
                priority=Priority.MEDIUM,
                site_id=prediction.site_id,
                action="Charge battery during forecast generation window before next peak.",
                why_now=f"SoC is {soc_pct:.0f}%. Generation forecast provides charge opportunity.",
                evidence=[f"current SoC: {soc_pct:.0f}%",
                          f"expected generation: {prediction.expected_generation_mwh:.1f} MWh",
                          f"forecast trust: {trust:.0%}"],
                confidence=round(trust * 0.85, 3),
                urgency_hours=4.0,
                estimated_value_usd=prediction.expected_generation_mwh * self._price_per_mwh * 0.10,
                risk_if_ignored="Insufficient charge state before peak demand window.",
                recommendation_score=round(score, 4),
                audit_trace_id=trace_id,
            ))

    def rank_portfolio(
        self,
        portfolio_prediction: PortfolioPrediction,
    ) -> DecisionSet:
        recs: list[RankedRecommendation] = []
        trace_id = self._make_id("trace")
        trust = portfolio_prediction.forecast_trust

        if trust < 0.60:
            score = self._composite_score(
                evidence_strength=1.0 - trust,
                confidence=0.88,
                urgency=0.80,
                financial_impact=0.65,
            )
            recs.append(RankedRecommendation(
                recommendation_id=self._make_id("rec"),
                recommendation_type=RecommendationType.REFORECAST,
                priority=Priority.HIGH,
                site_id=None,
                action="Refresh portfolio forecast before operations planning.",
                why_now=f"Portfolio forecast trust is {trust:.0%}.",
                evidence=[
                    f"structural error: {portfolio_prediction.structural_error:.0%}",
                    f"predictive error: {portfolio_prediction.predictive_error:.0%}",
                    f"observational noise: {portfolio_prediction.observational_noise:.0%}",
                ],
                confidence=0.88,
                urgency_hours=2.0,
                estimated_value_usd=None,
                risk_if_ignored="Low-confidence portfolio forecast drives unreliable dispatch decisions.",
                recommendation_score=round(score, 4),
                audit_trace_id=trace_id,
            ))

        for risk in portfolio_prediction.primary_risk_factors:
            score = self._composite_score(0.6, 0.70, 0.55, 0.45)
            recs.append(RankedRecommendation(
                recommendation_id=self._make_id("rec"),
                recommendation_type=RecommendationType.MONITOR,
                priority=Priority.INFORMATIONAL,
                site_id=None,
                action=f"Monitor: {risk}",
                why_now="Portfolio risk factor identified in current evaluation pass.",
                evidence=[risk],
                confidence=0.70,
                urgency_hours=None,
                estimated_value_usd=None,
                risk_if_ignored=None,
                recommendation_score=round(score, 4),
                audit_trace_id=trace_id,
            ))

        recs.sort(key=lambda r: r.recommendation_score, reverse=True)
        return DecisionSet(
            portfolio_id=portfolio_prediction.portfolio_id,
            site_id=None,
            recommendations=recs,
        )
