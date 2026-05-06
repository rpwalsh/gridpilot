"""
Signal state evaluator — converts deviation events to signal events.

Maps measured deviation conditions to ThresholdState codes.
Does not produce prose, recommendations, action items, or operator instructions.
Output is a list of SignalEvents ordered by severity (CRITICAL first).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from dispatchlayer_anomaly.detector import DeviationEvent
from dispatchlayer_anomaly.conditions import AnomalyCondition

from .signal_event import SignalEvent, ThresholdState, state_severity


_RESIDUAL_THRESHOLDS = {
    ThresholdState.CRITICAL: 40.0,
    ThresholdState.HIGH:     20.0,
    ThresholdState.WATCH:    10.0,
}


def _residual_state(residual_pct: float) -> ThresholdState:
    abs_r = abs(residual_pct)
    if abs_r >= _RESIDUAL_THRESHOLDS[ThresholdState.CRITICAL]:
        return ThresholdState.CRITICAL
    if abs_r >= _RESIDUAL_THRESHOLDS[ThresholdState.HIGH]:
        return ThresholdState.HIGH
    if abs_r >= _RESIDUAL_THRESHOLDS[ThresholdState.WATCH]:
        return ThresholdState.WATCH
    return ThresholdState.NOMINAL


def _condition_to_metric(condition: AnomalyCondition) -> str:
    return {
        AnomalyCondition.UNDERPRODUCTION:    "power_kw.residual",
        AnomalyCondition.OVERPRODUCTION:     "power_kw.residual",
        AnomalyCondition.CURTAILMENT:        "curtailment_flag",
        AnomalyCondition.SENSOR_ANOMALY:     "sensor.quality",
        AnomalyCondition.ICING_RISK:         "temperature_c.threshold",
        AnomalyCondition.HIGH_TEMPERATURE:   "temperature_c.threshold",
        AnomalyCondition.COMMUNICATION_LOSS: "comms.latency",
    }.get(condition, "unknown")


def evaluate_signal_events(
    events: list[DeviationEvent],
) -> list[SignalEvent]:
    """
    Convert a list of deviation events into signal events.

    Each event maps to a structured SignalEvent with ThresholdState.
    No prose, recommendations, or action items are generated.
    """
    ts = datetime.now(timezone.utc).isoformat()
    result: list[SignalEvent] = []

    for ev in events:
        state = _residual_state(ev.residual_pct)

        # Curtailment is always at least WATCH regardless of residual magnitude
        if ev.condition == AnomalyCondition.CURTAILMENT:
            state = max(state, ThresholdState.WATCH, key=state_severity)

        signal_id = f"sig_{uuid.uuid4().hex[:10]}"
        delta = ev.actual_output_kw - ev.expected_output_kw

        result.append(SignalEvent(
            signal_id=signal_id,
            timestamp_utc=ts,
            source=ev.asset_id,
            channel=ev.site_id,
            metric=_condition_to_metric(ev.condition),
            observed_value=ev.actual_output_kw,
            expected_value=ev.expected_output_kw,
            lower_band=None,
            upper_band=None,
            delta=round(delta, 2),
            unit="kW",
            state=state,
            audit_hash=SignalEvent.compute_hash(signal_id, ts, ev.actual_output_kw),
        ))

    return result


def rank_signal_events(events: list[SignalEvent]) -> list[SignalEvent]:
    """Sort signal events by state severity descending (CRITICAL first)."""
    return sorted(events, key=lambda e: state_severity(e.state), reverse=True)
