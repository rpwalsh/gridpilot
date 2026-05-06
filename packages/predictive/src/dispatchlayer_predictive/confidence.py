from __future__ import annotations
import math
from datetime import datetime, timezone
from .evidence_graph import EvidenceGraph
from .signal_state import Signal


def signal_recency_weight(signal: Signal, now: datetime | None = None) -> float:
    """Return a weight [0,1] that decays with signal age. 1.0 = fresh, 0.1 = 24h old."""
    if now is None:
        now = datetime.now(timezone.utc)
    ts = signal.timestamp_utc
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    age_hours = (now - ts).total_seconds() / 3600.0
    return max(0.05, math.exp(-0.115 * age_hours))


def compute_confidence(
    graph: EvidenceGraph,
    signals: dict[str, Signal] | None = None,
    now: datetime | None = None,
) -> float:
    """Compute a confidence score [0,1] for the graph hypothesis."""
    if not graph.nodes:
        return 0.0

    weighted_scores: list[float] = []
    for node in graph.nodes:
        base = node.weight
        quality = 1.0
        recency = 1.0
        if signals and node.signal_name in signals:
            sig = signals[node.signal_name]
            quality = sig.confidence
            recency = signal_recency_weight(sig, now)
        weighted_scores.append(base * quality * recency)

    return min(sum(weighted_scores) / len(weighted_scores), 1.0)
