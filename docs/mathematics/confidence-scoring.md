# Confidence Scoring

## What confidence means in practice

A confidence score is DispatchLayer's estimate of how much it trusts the signals driving a forecast or recommendation. It is not a model accuracy metric — it is a live data-quality indicator that reflects whether the inputs to the predictive core are fresh, complete, and within expected ranges.

A recommendation backed by a confidence of 0.85 means the system has clean, fresh, consistent signals and you can act on it with low risk of the underlying data being wrong. A recommendation backed by 0.35 means something upstream is degraded — a sensor is suspect, a provider is slow, or the observed output diverges sharply from what the model expects.

---

## Confidence Computation Pipeline

Each signal begins with `confidence = 1.0`. Confidence is reduced at each stage:

### Stage 1 — Signal Validation

- Missing value (`None`): `confidence = 0.0`, `is_missing = True`
- Out-of-range value: `confidence = min(confidence, 0.3)`, `is_anomalous = True`

A missing value drops to zero immediately — the system will not guess at what a missing sensor should read. An out-of-range value (e.g., wind speed of 120 m/s, negative GHI) is capped at 0.3 rather than zeroed, because the physical quantity may still be broadly correct even if the specific reading is faulty.

### Stage 2 — Evidence Graph Combination

Each node in the evidence graph computes a combined confidence from its input signals using the geometric mean:

```
c_node = (∏ᵢ cᵢ)^(1/n)
```

The geometric mean ensures a single very-low confidence signal pulls down the combined result. If you have four signals at 0.95, 0.90, 0.88, and 0.15, the combined confidence is approximately 0.57 — not the 0.72 you'd get from a simple average. This is intentional: one bad input is a warning that cannot be quietly absorbed.

### Stage 3 — Residual Adjustment

When a significant residual is detected, confidence is further discounted:

```
c_adjusted = c_combined × max(0.1, 1 − |residual_pct| / 200)
```

This caps the penalty at 90% — even a 200% residual cannot drive confidence below 10% of its prior value. The logic: a large residual tells you the model is wrong about something, but it doesn't mean every signal is useless. The system should flag the discrepancy, not shut down.

### Stage 4 — Cross-Source Reconciliation

When multiple provider sources are available for the same quantity, a weighted blend is computed:

```
c_reconciled = (w₁c₁ + w₂c₂ + ...) / Σwᵢ

where wᵢ = cᵢ²
```

Quadratic weighting strongly favours the more confident source. A source with confidence 0.9 receives roughly nine times the weight of a source with confidence 0.3. The final reconciled confidence is always between the lowest and highest contributing source.

---

## What to do at each confidence level

| Range | Grade | What it means | Recommended action |
|-------|-------|----------------|-------------------|
| 0.8–1.0 | A | Clean signals, fresh data, model consistent with observations | Proceed automatically or with routine review |
| 0.5–0.8 | B | Minor degradation — one provider slow, small residual, or one signal near range limits | Flag for operator awareness; act on recommendations with normal care |
| 0.2–0.5 | C | Significant degradation — stale data, anomalous reading, or large residual | Do not act automatically; review the audit trace to identify which signal is degraded |
| 0.0–0.2 | D | Severe degradation — missing data, multiple anomalous signals, or very large residual | Do not act; escalate; the forecast is not reliable enough for automated dispatch |

---

## Diagnosing low confidence

When a trust score drops below 0.5, look at the `error_decomposition` in the response:

```json
{
  "forecast_trust_score": 0.43,
  "error_decomposition": {
    "structural_error": { "score": 0.22, "meaning": "site model is not matching observations well" },
    "predictive_error": { "score": 0.11, "meaning": "horizon is within calibrated range" },
    "observational_noise": { "score": 0.10, "meaning": "data freshness is acceptable" }
  },
  "dominant_term": "structural",
  "warnings": ["Trailing residuals show persistent negative bias — check asset model or sensor calibration."]
}
```

**Dominant term: structural** → The site model does not reflect current conditions. Common causes: new curtailment agreement, unlogged maintenance, clipping that isn't captured in the asset model. Check the asset configuration and trailing residuals.

**Dominant term: predictive** → The forecast horizon is too long or the signal variance is high. Shorten the window or wait for fresher observations before acting.

**Dominant term: observational** → The source data is stale or noisy. Check provider health (`GET /providers/health`) and whether the cache is serving old data.

---

## Confidence in the audit trace

Every step in the decision trace records the confidence at that stage. To understand exactly where confidence was lost on a specific event, retrieve the trace:

```bash
curl http://localhost:8000/api/v1/audit/trace/{trace_id}
```

Look for any step where `output.confidence` drops sharply compared to the previous step. That step is where the degraded signal entered the pipeline.

---

## Related documentation

- [Predictive Math Core](predictive-math-core.md) — the full L→G→P→D pipeline
- [Residual Analysis](residual-analysis.md) — how the residual adjustment term is computed
- [Decision Trace](decision-trace.md) — how to replay confidence changes step by step
- [Replay and Audit](../replay-and-audit.md) — post-event investigation workflow
