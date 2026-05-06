from __future__ import annotations
from .engine import Recommendation


def rank_recommendations(recommendations: list[Recommendation]) -> list[Recommendation]:
    """Sort recommendations by priority score descending."""
    return sorted(recommendations, key=lambda r: r.priority_score, reverse=True)
