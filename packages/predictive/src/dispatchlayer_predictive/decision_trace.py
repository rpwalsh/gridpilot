from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
import uuid


@dataclass
class AuditStep:
    step: str
    inputs: dict[str, Any]
    output: Any
    method: str


# Backward-compatible alias
TraceStep = AuditStep


@dataclass
class AuditTrace:
    trace_id: str = field(default_factory=lambda: f"trace_{uuid.uuid4().hex[:12]}")
    created_utc: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    steps: list[AuditStep] = field(default_factory=list)
    model_versions: dict[str, str] = field(default_factory=dict)

    def add_step(self, step: str, inputs: dict, output: Any, method: str) -> None:
        self.steps.append(AuditStep(step, inputs, output, method))

    def to_dict(self) -> dict:
        return {
            "trace_id": self.trace_id,
            "created_utc": self.created_utc.isoformat(),
            "steps": [
                {
                    "step": s.step,
                    "inputs": s.inputs,
                    "output": str(s.output) if not isinstance(s.output, (dict, list, str, int, float, bool, type(None))) else s.output,
                    "method": s.method,
                }
                for s in self.steps
            ],
            "model_versions": self.model_versions,
        }


# Backward-compatible alias
DecisionTrace = AuditTrace
