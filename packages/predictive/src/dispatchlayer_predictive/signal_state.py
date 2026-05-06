# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Any
from datetime import datetime, timezone


@dataclass
class Signal:
    name: str
    value: Any
    unit: Optional[str]
    source: str
    timestamp_utc: datetime
    confidence: float = 1.0
    is_missing: bool = False
    is_anomalous: bool = False


_SIGNAL_RANGES: dict[str, tuple[float, float]] = {
    "wind_speed_mps": (0.0, 100.0),
    "temperature_c": (-60.0, 60.0),
    "cloud_cover_pct": (0.0, 100.0),
    "output_kw": (0.0, 1e9),
    "soc_pct": (0.0, 100.0),
    "ghi_wm2": (0.0, 1400.0),
    "dni_wm2": (0.0, 1400.0),
}


@dataclass
class SignalState:
    signals: dict[str, Signal]
    context: dict[str, Any] = field(default_factory=dict)

    def get(self, name: str) -> Optional[Signal]:
        return self.signals.get(name)

    def normalize(self) -> "SignalState":
        normalized: dict[str, Signal] = {}
        for name, sig in self.signals.items():
            is_missing = sig.value is None
            is_anomalous = False
            confidence = sig.confidence

            if not is_missing and name in _SIGNAL_RANGES:
                lo, hi = _SIGNAL_RANGES[name]
                try:
                    v = float(sig.value)
                    if not (lo <= v <= hi):
                        is_anomalous = True
                        confidence = min(confidence, 0.3)
                except (TypeError, ValueError):
                    is_missing = True

            if is_missing:
                confidence = 0.0

            normalized[name] = Signal(
                name=sig.name,
                value=sig.value,
                unit=sig.unit,
                source=sig.source,
                timestamp_utc=sig.timestamp_utc,
                confidence=confidence,
                is_missing=is_missing,
                is_anomalous=is_anomalous,
            )
        return SignalState(signals=normalized, context=self.context)
