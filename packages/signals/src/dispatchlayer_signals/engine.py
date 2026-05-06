# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
Threshold crossing engine â€” converts deviation events to structured signal events.

Output is measured state: threshold codes, severity levels, residuals.
No prose, no operator instructions, no text interpretations.
"""
from __future__ import annotations

from dispatchlayer_anomaly.conditions import AnomalyCondition  # noqa: F401 (re-exported)
from dispatchlayer_anomaly.detector import DeviationEvent

from .signal_event import SignalEvent, ThresholdState, state_severity
from .evaluator import evaluate_signal_events, rank_signal_events


class ThresholdCrossingEngine:
    """
    Maps deviation events to threshold state codes.

    Read-only.  No command or control path.
    Output: list[SignalEvent] ordered by state severity descending.
    """

    def evaluate(self, events: list[DeviationEvent]) -> list[SignalEvent]:
        """Evaluate deviation events and return ranked signal events."""
        return rank_signal_events(evaluate_signal_events(events))


__all__ = [
    "ThresholdCrossingEngine",
    "evaluate_signal_events",
    "rank_signal_events",
    "SignalEvent",
    "ThresholdState",
    "state_severity",
    "AnomalyCondition",
]
