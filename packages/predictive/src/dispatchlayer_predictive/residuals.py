# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
from dataclasses import dataclass


@dataclass
class ResidualResult:
    absolute_delta: float
    percent_delta: float
    duration_intervals: int
    is_significant: bool
    direction: str


def compute_residual(
    expected: float,
    actual: float,
    capacity: float,
    threshold_pct: float = 10.0,
) -> ResidualResult:
    absolute_delta = actual - expected
    percent_delta = (absolute_delta / expected * 100.0) if expected != 0 else 0.0
    is_significant = abs(percent_delta) > threshold_pct
    if percent_delta < -threshold_pct:
        direction = "under"
    elif percent_delta > threshold_pct:
        direction = "over"
    else:
        direction = "normal"
    return ResidualResult(
        absolute_delta=absolute_delta,
        percent_delta=percent_delta,
        duration_intervals=1,
        is_significant=is_significant,
        direction=direction,
    )
