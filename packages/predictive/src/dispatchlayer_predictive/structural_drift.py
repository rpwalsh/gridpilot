# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
Structural Drift Detector

Detects when the operating regime of a site or portfolio has shifted from its
recent baseline in a way that should degrade forecast confidence or trigger
re-evaluation.

This is the P-layer concept translated from spectral drift / eigenvalue
forecasting into renewable-operations terms:

  Instead of tracking graph spectral drift, we track how the relationship
  between input signals (weather, grid) and output measurements (generation)
  has changed relative to the recent trailing window.

  If the residual distribution (forecast error history) has shifted, it means
  either:
    (a) the weather-production relationship has changed (regime transition), or
    (b) the forecast model is no longer calibrated to current conditions, or
    (c) an asset or sensor fault is producing a persistent bias.

Detecting this early  before the bias compounds across a full dispatch window 
is one of the key value propositions of the predictive layer.
"""
from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class DriftRisk(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class DriftWarning:
    """Structural drift assessment for one site or portfolio evaluation."""

    site_id: Optional[str]
    risk: DriftRisk
    reason: str
    likely_effects: list[str] = field(default_factory=list)
    threshold_state_label: str = ""
    drift_magnitude: float = 0.0   # standardised drift score 01


def detect_residual_drift(
    site_id: Optional[str],
    recent_residuals: list[float],   # recent forecast errors as % (positive = over-forecast)
    baseline_residuals: list[float], # trailing baseline window forecast errors
    *,
    drift_threshold_std: float = 1.5,  # flag if mean shift > N baseline std devs
) -> DriftWarning:
    """
    Detect whether the recent residual distribution has drifted from the baseline.

    Parameters
    ----------
    recent_residuals:
        Forecast error history for the most recent window (e.g. last 6–12 observations).
    baseline_residuals:
        Trailing baseline (e.g. last 14 days of forecast errors).
    drift_threshold_std:
        Flag as drift if the recent mean has shifted by more than this many standard
        deviations from the baseline distribution.
    """
    if len(recent_residuals) < 2 or len(baseline_residuals) < 4:
        return DriftWarning(
            site_id=site_id,
            risk=DriftRisk.NONE,
            reason="Insufficient history to assess drift.",
        )

    baseline_mean = statistics.mean(baseline_residuals)
    baseline_std = statistics.stdev(baseline_residuals) if len(baseline_residuals) > 1 else 1.0
    baseline_std = max(baseline_std, 0.5)  # floor to avoid division noise

    recent_mean = statistics.mean(recent_residuals)
    shift_std = abs(recent_mean - baseline_mean) / baseline_std
    drift_magnitude = min(1.0, shift_std / (drift_threshold_std * 2))

    if shift_std < 1.0:
        return DriftWarning(
            site_id=site_id,
            risk=DriftRisk.NONE,
            reason="Residual distribution is within baseline range.",
            drift_magnitude=round(drift_magnitude, 3),
        )

    direction = "over-forecasting" if recent_mean > baseline_mean else "under-forecasting"

    if shift_std < drift_threshold_std:
        risk = DriftRisk.LOW
        reason = f"Mild residual drift detected ({direction}); within monitoring threshold."
        effects = ["forecast confidence slightly reduced for next window"]
        action = "Monitor over next 24 observations before acting."
    elif shift_std < drift_threshold_std * 2:
        risk = DriftRisk.MEDIUM
        reason = f"Residual distribution has shifted ({direction}). Regime may be transitioning."
        effects = [
            "forecast confidence degraded for next 12–18 hours",
            "dispatch decisions should carry wider uncertainty margin",
        ]
        action = "Refresh forecast reconciliation before next dispatch planning cycle."
    else:
        risk = DriftRisk.HIGH
        reason = (
            f"Significant structural drift detected ({direction}). "
            f"Recent forecast errors are {shift_std:.1f} from baseline."
        )
        effects = [
            "forecast model may no longer be calibrated to current conditions",
            "asset fault or sensor bias should be investigated",
            "dispatch planning should use wider confidence bands",
        ]
        action = "Investigate root cause before relying on current forecast model."

    return DriftWarning(
        site_id=site_id,
        risk=risk,
        reason=reason,
        likely_effects=effects,
        threshold_state_label=action,
        drift_magnitude=round(drift_magnitude, 3),
    )


def detect_portfolio_drift(
    portfolio_id: str,
    site_drift_warnings: list[DriftWarning],
) -> DriftWarning:
    """
    Aggregate site-level drift warnings into a portfolio-level assessment.
    """
    if not site_drift_warnings:
        return DriftWarning(
            site_id=None,
            risk=DriftRisk.NONE,
            reason="No site drift data available.",
        )

    risk_order = [DriftRisk.NONE, DriftRisk.LOW, DriftRisk.MEDIUM, DriftRisk.HIGH]
    max_risk = max(site_drift_warnings, key=lambda w: risk_order.index(w.risk)).risk
    high_count = sum(1 for w in site_drift_warnings if w.risk in (DriftRisk.HIGH, DriftRisk.MEDIUM))
    total = len(site_drift_warnings)

    if max_risk == DriftRisk.NONE:
        return DriftWarning(
            site_id=None,
            risk=DriftRisk.NONE,
            reason="Portfolio residual distributions are within baseline range.",
        )

    reason = (
        f"{high_count} of {total} sites show {max_risk.value} or higher drift risk. "
        "Portfolio forecast confidence is degraded."
    )
    effects = [
        "portfolio-level forecast uncertainty elevated",
        "consider refreshing forecast reconciliation for affected sites",
    ]
    action = "Review sites flagged with medium or high drift before dispatch planning."

    return DriftWarning(
        site_id=None,
        risk=max_risk,
        reason=reason,
        likely_effects=effects,
        threshold_state_label=action,
        drift_magnitude=round(
            sum(w.drift_magnitude for w in site_drift_warnings) / total, 3
        ),
    )

