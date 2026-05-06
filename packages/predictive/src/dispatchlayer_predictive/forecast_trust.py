# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
Forecast Trust Score

Provides a structured, operator-readable trust assessment for any forecast.

Instead of a single opaque probability, the trust score decomposes uncertainty
into three actionable terms that tell an operator *where* the uncertainty comes
from and what to do about it:

  structural_error    How well does the current site/portfolio state represent
                       reality?  Degrades when data is stale, providers disagree,
                       or structural mapping is sparse.

  predictive_error    How reliably does the model extrapolate over this horizon?
                       Degrades with longer horizons, volatile weather regimes,
                       and sparse historical calibration.

  observational_noise  The irreducible measurement uncertainty in source data.
                        This is the floor: no model can beat it.

The Conditional Two-Percent Corollary: if all three terms are small (high
data quality, short horizon, calibrated model) the total error can fall to 2%
or below.  This documents *under what conditions* high-accuracy forecasting
is achievable, rather than claiming it unconditionally.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ErrorTermExplanation:
    score: float          # 01, higher = more error from this source
    meaning: str          # what does this score mean operationally?
    action: str           # what can the operator do to reduce it?


@dataclass
class ForecastTrustScore:
    """
    Structured forecast trust assessment with three-term error decomposition.
    This is the output operators see when they ask "how much should I trust this?"
    """

    trust_score: float           # 01, higher = more trustworthy
    structural_error: ErrorTermExplanation
    predictive_error: ErrorTermExplanation
    observational_noise: ErrorTermExplanation
    warnings: list[str] = field(default_factory=list)
    dominant_term: str = ""       # which term contributes most to uncertainty

    @property
    def grade(self) -> str:
        """Human-readable trust grade."""
        if self.trust_score >= 0.85:
            return "high"
        elif self.trust_score >= 0.70:
            return "moderate"
        elif self.trust_score >= 0.55:
            return "low"
        else:
            return "very_low"


def compute_trust_score(
    structural_error: float,
    predictive_error: float,
    observational_noise: float,
    *,
    extra_warnings: list[str] | None = None,
) -> ForecastTrustScore:
    """
    Compute a ForecastTrustScore from the three error terms.

    Each term is 01 (0 = no error, 1 = complete uncertainty from this source).
    The trust score is 1  clipped sum of terms.
    """
    total_error = min(structural_error + predictive_error + observational_noise, 0.80)
    trust = max(0.10, min(0.97, 1.0 - total_error))

    warnings: list[str] = list(extra_warnings or [])

    # Structural error explanation
    if structural_error < 0.08:
        s_meaning = "site model has good asset and weather mapping; data is fresh"
        s_action = "no action required"
    elif structural_error < 0.20:
        s_meaning = "moderate forecast disagreement or data quality gaps"
        s_action = "verify weather provider freshness and check recent telemetry"
    else:
        s_meaning = "significant forecast disagreement or data quality problems"
        s_action = "refresh data sources before finalising dispatch plan"
        warnings.append("structural data quality below acceptable threshold")

    # Predictive error explanation
    if predictive_error < 0.10:
        p_meaning = "forecast horizon is within calibrated range"
        p_action = "no action required"
    elif predictive_error < 0.25:
        p_meaning = "forecast horizon extends into less reliable range"
        p_action = "consider refreshing at midpoint of planning window"
    else:
        p_meaning = "long forecast horizon; model uncertainty is elevated"
        p_action = "segment the window and reforecast at each decision point"
        warnings.append("long-horizon forecast: predictive error is elevated")

    # Observational noise explanation
    if observational_noise < 0.05:
        o_meaning = "source data is fresh and mostly complete"
        o_action = "no action required"
    elif observational_noise < 0.12:
        o_meaning = "minor measurement uncertainty in source data"
        o_action = "review any flagged missing or imputed data points"
    else:
        o_meaning = "elevated measurement noise; some sources may be incomplete"
        o_action = "identify missing sensors or stale API responses"
        warnings.append("elevated observational noise: check source completeness")

    terms = {
        "structural": structural_error,
        "predictive": predictive_error,
        "observational": observational_noise,
    }
    dominant = max(terms, key=terms.__getitem__)

    return ForecastTrustScore(
        trust_score=round(trust, 3),
        structural_error=ErrorTermExplanation(
            score=round(structural_error, 4),
            meaning=s_meaning,
            action=s_action,
        ),
        predictive_error=ErrorTermExplanation(
            score=round(predictive_error, 4),
            meaning=p_meaning,
            action=p_action,
        ),
        observational_noise=ErrorTermExplanation(
            score=round(observational_noise, 4),
            meaning=o_meaning,
            action=o_action,
        ),
        warnings=warnings,
        dominant_term=dominant,
    )

