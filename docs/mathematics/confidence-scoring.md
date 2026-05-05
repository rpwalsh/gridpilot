# Confidence Scoring

## Confidence Computation Pipeline

Each signal begins with `confidence = 1.0`. Confidence is reduced at each stage:

### Stage 1 — Signal Validation

- Missing value (`None`): `confidence = 0.0`, `is_missing = True`
- Out-of-range value: `confidence = min(confidence, 0.3)`, `is_anomalous = True`

### Stage 2 — Evidence Graph Combination

Each node in the evidence graph computes a combined confidence from its input signals using the geometric mean:

```
c_node = (∏ᵢ cᵢ)^(1/n)
```

### Stage 3 — Residual Adjustment

When a significant residual is detected, confidence is further discounted:

```
c_adjusted = c_combined × max(0.1, 1 − |residual_pct| / 200)
```

This caps the penalty at 90% — even a 200% residual cannot drive confidence below 10% of its prior value.

### Stage 4 — Cross-Source Reconciliation

When multiple provider sources are available, the highest-confidence source dominates and others contribute via weighted average:

```
c_reconciled = (w₁c₁ + w₂c₂ + ...) / Σwᵢ
```

where `wᵢ = cᵢ²` (quadratic weighting favours confident sources).

## Interpretation

| Range | Interpretation |
|-------|----------------|
| 0.8–1.0 | High confidence — proceed automatically |
| 0.5–0.8 | Moderate confidence — recommended action |
| 0.2–0.5 | Low confidence — flag for operator review |
| 0.0–0.2 | Very low confidence — do not act, escalate |
