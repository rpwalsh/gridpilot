"""Tests for the signal state evaluator."""
from datetime import datetime, timezone

from dispatchlayer_anomaly.conditions import AnomalyCondition
from dispatchlayer_anomaly.detector import DeviationEvent
from dispatchlayer_predictive.decision_trace import DecisionTrace

from dispatchlayer_signals.evaluator import evaluate_signal_events, rank_signal_events
from dispatchlayer_signals.signal_event import ThresholdState


def _make_event(
    residual_pct: float,
    condition: AnomalyCondition = AnomalyCondition.UNDERPRODUCTION,
    asset_id: str = "WTG-001",
    site_id: str = "SITE-A",
) -> DeviationEvent:
    trace = DecisionTrace(model_versions={"test": "0.1"})
    return DeviationEvent(
        event_id="dev_test_001",
        asset_id=asset_id,
        site_id=site_id,
        condition=condition,
        residual_pct=residual_pct,
        expected_output_kw=1000.0,
        actual_output_kw=1000.0 * (1 + residual_pct / 100),
        confidence=0.9,
        hypotheses=[],
        decision_trace=trace,
    )


def test_critical_threshold():
    events = [_make_event(-45.0)]
    result = evaluate_signal_events(events)
    assert len(result) == 1
    assert result[0].state == ThresholdState.CRITICAL


def test_high_threshold():
    events = [_make_event(-25.0)]
    result = evaluate_signal_events(events)
    assert result[0].state == ThresholdState.HIGH


def test_watch_threshold():
    events = [_make_event(-12.0)]
    result = evaluate_signal_events(events)
    assert result[0].state == ThresholdState.WATCH


def test_curtailment_at_least_watch():
    events = [_make_event(-5.0, condition=AnomalyCondition.CURTAILMENT)]
    result = evaluate_signal_events(events)
    # Curtailment forces at least WATCH even below watch threshold
    assert result[0].state in (ThresholdState.WATCH, ThresholdState.HIGH, ThresholdState.CRITICAL)


def test_signal_event_fields():
    events = [_make_event(-25.0)]
    result = evaluate_signal_events(events)
    ev = result[0]
    assert ev.source == "WTG-001"
    assert ev.channel == "SITE-A"
    assert ev.unit == "kW"
    assert ev.delta is not None
    assert ev.audit_hash != ""
    assert ev.signal_id.startswith("sig_")


def test_no_prose_fields():
    """Signal events must not carry prose, recommendation, or action fields."""
    events = [_make_event(-30.0)]
    result = evaluate_signal_events(events)
    ev = result[0]
    ev_dict = ev.__dict__
    forbidden = {"action", "why_now", "risk_if_ignored", "recommendation",
                 "description", "summary", "insight", "message"}
    assert not (forbidden & set(ev_dict.keys()))


def test_ranking_order():
    events = [
        _make_event(-12.0, asset_id="A"),   # WATCH
        _make_event(-45.0, asset_id="B"),   # CRITICAL
        _make_event(-22.0, asset_id="C"),   # HIGH
    ]
    result = rank_signal_events(evaluate_signal_events(events))
    assert result[0].state == ThresholdState.CRITICAL
    assert result[1].state == ThresholdState.HIGH
    assert result[2].state == ThresholdState.WATCH


def test_empty_input():
    assert evaluate_signal_events([]) == []
    assert rank_signal_events([]) == []
