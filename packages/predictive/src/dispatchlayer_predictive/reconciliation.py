# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
import statistics


@dataclass
class ReconciliationResult:
    raw_forecast_mwh: float
    adjusted_forecast_mwh: float
    bias_correction: float
    confidence: float
    basis: list[str]


def reconcile_forecast(
    raw_forecast_mwh: float,
    historical_errors: list[float] | None = None,
    current_capacity_factor: Optional[float] = None,
    telemetry_deviation_pct: Optional[float] = None,
) -> ReconciliationResult:
    """Reconcile raw forecast with historical error patterns and current telemetry."""
    bias_correction = 0.0
    basis: list[str] = ["raw_forecast"]

    if historical_errors and len(historical_errors) >= 3:
        mean_error = statistics.mean(historical_errors)
        bias_correction -= mean_error
        basis.append(f"historical_bias_correction:{mean_error:.3f}mwh")

    if telemetry_deviation_pct is not None:
        telemetry_adjustment = raw_forecast_mwh * (telemetry_deviation_pct / 100.0) * 0.5
        bias_correction += telemetry_adjustment
        basis.append(f"telemetry_adjustment:{telemetry_adjustment:.3f}mwh")

    adjusted = raw_forecast_mwh + bias_correction

    n_evidence = len(basis)
    confidence = min(0.5 + 0.1 * n_evidence, 0.95)
    if historical_errors and len(historical_errors) >= 10:
        std = statistics.stdev(historical_errors)
        relative_std = std / max(abs(raw_forecast_mwh), 1.0)
        confidence = min(confidence, max(0.3, 1.0 - relative_std))

    return ReconciliationResult(
        raw_forecast_mwh=raw_forecast_mwh,
        adjusted_forecast_mwh=adjusted,
        bias_correction=bias_correction,
        confidence=confidence,
        basis=basis,
    )
