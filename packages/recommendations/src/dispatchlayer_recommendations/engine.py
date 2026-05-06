from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import uuid

from dispatchlayer_anomaly.detector import AnomalyFinding
from dispatchlayer_anomaly.conditions import AnomalyCondition
from dispatchlayer_predictive.decision_trace import DecisionTrace


class RecommendationType(str, Enum):
    MAINTENANCE = "maintenance"
    INSPECTION = "inspection"
    CURTAILMENT_REVIEW = "curtailment_review"
    DISPATCH_ADJUSTMENT = "dispatch_adjustment"
    MONITORING = "monitoring"
    EMERGENCY = "emergency"


@dataclass
class Recommendation:
    recommendation_id: str
    rec_type: RecommendationType
    asset_id: str
    site_id: str
    title: str
    description: str
    urgency: str
    confidence: float
    estimated_value_usd: float
    action_steps: list[str]
    decision_trace: DecisionTrace
    priority_score: float = 0.0


_URGENCY_SCORES = {
    "immediate": 4,
    "within_24h": 3,
    "within_week": 2,
    "monitor": 1,
}

_HOURS_PER_YEAR = 8760


def _estimate_annual_value(capacity_kw: float, residual_pct: float, price_per_mwh: float, cf: float = 0.35) -> float:
    """Estimate annual revenue impact of underproduction."""
    lost_fraction = abs(residual_pct) / 100.0
    return capacity_kw / 1000.0 * cf * _HOURS_PER_YEAR * lost_fraction * price_per_mwh


def generate_recommendations(
    findings: list[AnomalyFinding],
    price_per_mwh: float = 50.0,
) -> list[Recommendation]:
    recommendations: list[Recommendation] = []

    for finding in findings:
        trace = DecisionTrace(model_versions={"recommendations": "0.1.0", "predictive_core": "0.1.0"})
        top_cause = finding.hypotheses[0].cause if finding.hypotheses else "unknown"
        top_confidence = finding.hypotheses[0].confidence if finding.hypotheses else 0.5

        trace.add_step(
            "select_recommendation_type",
            inputs={"condition": finding.condition.value, "top_cause": top_cause, "residual_pct": finding.residual_pct},
            output=None,
            reasoning=f"Finding condition '{finding.condition.value}' with cause '{top_cause}' maps to recommendation type",
        )

        if finding.condition == AnomalyCondition.CURTAILMENT:
            rec = Recommendation(
                recommendation_id=f"rec_{uuid.uuid4().hex[:10]}",
                rec_type=RecommendationType.CURTAILMENT_REVIEW,
                asset_id=finding.asset_id,
                site_id=finding.site_id,
                title=f"Review curtailment constraints on {finding.asset_id}",
                description=f"Asset is curtailed with a {abs(finding.residual_pct):.1f}% production impact. Review grid operator constraints.",
                urgency="within_24h",
                confidence=top_confidence,
                estimated_value_usd=_estimate_annual_value(finding.expected_output_kw, finding.residual_pct, price_per_mwh),
                action_steps=[
                    "Contact grid operator to confirm curtailment order",
                    "Verify curtailment signal is not erroneous",
                    "Document curtailment duration and reason",
                ],
                decision_trace=trace,
            )
        elif top_cause == "yaw_misalignment":
            rec = Recommendation(
                recommendation_id=f"rec_{uuid.uuid4().hex[:10]}",
                rec_type=RecommendationType.MAINTENANCE,
                asset_id=finding.asset_id,
                site_id=finding.site_id,
                title=f"Inspect yaw system on {finding.asset_id}",
                description=f"Evidence of yaw misalignment: output {abs(finding.residual_pct):.1f}% below expected at rated wind speed.",
                urgency="within_24h",
                confidence=top_confidence,
                estimated_value_usd=_estimate_annual_value(finding.expected_output_kw, finding.residual_pct, price_per_mwh),
                action_steps=[
                    "Review SCADA yaw error logs",
                    "Schedule yaw calibration inspection",
                    "Check wind vane alignment",
                    "Verify yaw motor performance",
                ],
                decision_trace=trace,
            )
        elif top_cause == "blade_pitch_drift":
            rec = Recommendation(
                recommendation_id=f"rec_{uuid.uuid4().hex[:10]}",
                rec_type=RecommendationType.MAINTENANCE,
                asset_id=finding.asset_id,
                site_id=finding.site_id,
                title=f"Inspect blade pitch system on {finding.asset_id}",
                description=f"Sustained underproduction ({abs(finding.residual_pct):.1f}%) at rated wind speed consistent with blade pitch drift.",
                urgency="within_week",
                confidence=top_confidence,
                estimated_value_usd=_estimate_annual_value(finding.expected_output_kw, finding.residual_pct, price_per_mwh),
                action_steps=[
                    "Review pitch angle telemetry for all blades",
                    "Compare blade pitch deviations",
                    "Schedule pitch calibration if deviation exceeds 1 degree",
                ],
                decision_trace=trace,
            )
        elif top_cause == "icing_risk":
            rec = Recommendation(
                recommendation_id=f"rec_{uuid.uuid4().hex[:10]}",
                rec_type=RecommendationType.MONITORING,
                asset_id=finding.asset_id,
                site_id=finding.site_id,
                title=f"Monitor icing conditions on {finding.asset_id}",
                description="Temperature in icing range. Monitor blade icing indicators and consider activating anti-icing system.",
                urgency="immediate",
                confidence=top_confidence,
                estimated_value_usd=_estimate_annual_value(finding.expected_output_kw, finding.residual_pct, price_per_mwh) * 0.1,
                action_steps=[
                    "Activate blade de-icing system if available",
                    "Monitor power output for continued degradation",
                    "Consider shutdown if icing risk escalates",
                ],
                decision_trace=trace,
            )
        elif top_cause == "inverter_degradation":
            rec = Recommendation(
                recommendation_id=f"rec_{uuid.uuid4().hex[:10]}",
                rec_type=RecommendationType.INSPECTION,
                asset_id=finding.asset_id,
                site_id=finding.site_id,
                title=f"Inspect inverter performance on {finding.asset_id}",
                description=f"Good irradiance but {abs(finding.residual_pct):.1f}% underproduction suggests inverter degradation.",
                urgency="within_24h",
                confidence=top_confidence,
                estimated_value_usd=_estimate_annual_value(finding.expected_output_kw, finding.residual_pct, price_per_mwh),
                action_steps=[
                    "Review inverter fault logs",
                    "Check DC/AC conversion efficiency",
                    "Inspect string-level performance",
                    "Schedule inverter maintenance if efficiency < 95%",
                ],
                decision_trace=trace,
            )
        elif top_cause == "sensor_failure":
            rec = Recommendation(
                recommendation_id=f"rec_{uuid.uuid4().hex[:10]}",
                rec_type=RecommendationType.INSPECTION,
                asset_id=finding.asset_id,
                site_id=finding.site_id,
                title=f"Verify sensor data integrity for {finding.asset_id}",
                description=f"Extreme residual of {abs(finding.residual_pct):.1f}% may indicate sensor failure rather than production loss.",
                urgency="immediate",
                confidence=top_confidence,
                estimated_value_usd=0.0,
                action_steps=[
                    "Cross-validate output readings with adjacent meters",
                    "Inspect power meter connections",
                    "Check SCADA communication status",
                ],
                decision_trace=trace,
            )
        else:
            rec = Recommendation(
                recommendation_id=f"rec_{uuid.uuid4().hex[:10]}",
                rec_type=RecommendationType.MONITORING,
                asset_id=finding.asset_id,
                site_id=finding.site_id,
                title=f"Monitor underproduction on {finding.asset_id}",
                description=f"Asset showing {abs(finding.residual_pct):.1f}% underproduction without clear cause identified.",
                urgency="monitor",
                confidence=top_confidence,
                estimated_value_usd=_estimate_annual_value(finding.expected_output_kw, finding.residual_pct, price_per_mwh) * 0.5,
                action_steps=[
                    "Continue monitoring for 24 hours",
                    "Check weather forecasts for explanatory conditions",
                    "Escalate if underproduction persists",
                ],
                decision_trace=trace,
            )

        trace.add_step(
            "finalize_recommendation",
            inputs={"urgency": rec.urgency, "confidence": rec.confidence},
            output={"recommendation_id": rec.recommendation_id, "type": rec.rec_type.value},
            reasoning=f"Generated {rec.rec_type.value} recommendation with {rec.urgency} urgency",
        )

        rec.priority_score = top_confidence * _URGENCY_SCORES.get(rec.urgency, 1) * (1 + abs(finding.residual_pct) / 100.0)
        recommendations.append(rec)

    return recommendations
