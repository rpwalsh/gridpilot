from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
import uuid


@dataclass
class TraceStep:
    step: str
    inputs: dict[str, Any]
    output: Any
    reasoning: str


@dataclass
class DecisionTrace:
    trace_id: str = field(default_factory=lambda: f"trace_{uuid.uuid4().hex[:12]}")
    created_utc: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    steps: list[TraceStep] = field(default_factory=list)
    model_versions: dict[str, str] = field(default_factory=dict)

    def add_step(self, step: str, inputs: dict, output: Any, reasoning: str) -> None:
        self.steps.append(TraceStep(step, inputs, output, reasoning))

    def to_dict(self) -> dict:
        return {
            "trace_id": self.trace_id,
            "created_utc": self.created_utc.isoformat(),
            "steps": [
                {
                    "step": s.step,
                    "inputs": s.inputs,
                    "output": str(s.output) if not isinstance(s.output, (dict, list, str, int, float, bool, type(None))) else s.output,
                    "reasoning": s.reasoning,
                }
                for s in self.steps
            ],
            "model_versions": self.model_versions,
        }
