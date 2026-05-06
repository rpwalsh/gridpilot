"""
Signal event model — output of the threshold state evaluator.

A SignalEvent is a structured, auditable record of a threshold crossing or
deviation state.  It contains measured values, expected values, delta, unit,
and a threshold state code.  It does not contain prose, recommendations,
action items, or operator instructions.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ThresholdState(str, Enum):
    NOMINAL   = "NOMINAL"
    WATCH     = "WATCH"
    HIGH      = "HIGH"
    CRITICAL  = "CRITICAL"
    MISSING   = "MISSING"
    STALE     = "STALE"
    CONFLICT  = "CONFLICT"


# Severity order: higher index = higher severity
_STATE_ORDER = [
    ThresholdState.NOMINAL,
    ThresholdState.WATCH,
    ThresholdState.HIGH,
    ThresholdState.CRITICAL,
    ThresholdState.STALE,
    ThresholdState.MISSING,
    ThresholdState.CONFLICT,
]


def state_severity(state: ThresholdState) -> int:
    try:
        return _STATE_ORDER.index(state)
    except ValueError:
        return 0


@dataclass
class SignalEvent:
    """A single threshold crossing or deviation state record."""

    signal_id: str
    timestamp_utc: str
    source: str
    channel: str
    metric: str
    observed_value: float
    expected_value: Optional[float]
    lower_band: Optional[float]
    upper_band: Optional[float]
    delta: Optional[float]
    unit: str
    state: ThresholdState
    audit_hash: str

    @classmethod
    def compute_hash(cls, signal_id: str, timestamp_utc: str, observed_value: float) -> str:
        payload = json.dumps(
            {"signal_id": signal_id, "timestamp_utc": timestamp_utc, "observed_value": observed_value},
            sort_keys=True,
        ).encode()
        return hashlib.sha256(payload).hexdigest()[:16]
