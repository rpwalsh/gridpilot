from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class EvidenceNode:
    signal_name: str
    weight: float
    supports_hypothesis: str
    description: str


@dataclass
class EvidenceGraph:
    hypothesis: str
    nodes: list[EvidenceNode] = field(default_factory=list)

    def add_evidence(self, signal_name: str, weight: float, description: str) -> None:
        self.nodes.append(EvidenceNode(signal_name, weight, self.hypothesis, description))

    def aggregate_confidence(self) -> float:
        if not self.nodes:
            return 0.0
        total_weight = sum(n.weight for n in self.nodes)
        return min(total_weight / len(self.nodes), 1.0)

    def top_evidence(self, n: int = 3) -> list[EvidenceNode]:
        return sorted(self.nodes, key=lambda e: e.weight, reverse=True)[:n]
