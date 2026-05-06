# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Signal event ranking â€” sort by threshold state severity (CRITICAL first)."""
from __future__ import annotations

from .signal_event import SignalEvent, state_severity


def rank_by_severity(events: list[SignalEvent]) -> list[SignalEvent]:
    """Return signal events sorted by state severity, highest severity first."""
    return sorted(events, key=lambda e: state_severity(e.state), reverse=True)
