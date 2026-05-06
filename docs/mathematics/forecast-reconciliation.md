# Forecast Reconciliation

## Purpose

Forecast reconciliation ensures that individual asset forecasts are consistent with portfolio-level constraints, and that multiple provider sources are blended into a single coherent forecast value with appropriate confidence weighting.

---

## What It Produces

Reconciliation produces a single P10/P50/P90 envelope for the portfolio, and a single blended value when multiple providers report the same quantity.

Engineers can inspect the reconciliation inputs and outputs via the audit trace to understand how much each source contributed and whether provider disagreement affected the result.

---

## Portfolio Envelope: Variance-Sum Method

Given N assets each with symmetric spread `s_i = (p90_i − p10_i) / 2`, the portfolio spread is:

```
s_portfolio = √(Σᵢ sᵢ²)
p50_portfolio = Σᵢ p50_i
p10_portfolio = p50_portfolio − s_portfolio
p90_portfolio = p50_portfolio + s_portfolio
```

This models partial diversification: assets are neither perfectly correlated (which would give `Σ sᵢ`) nor perfectly independent (which would give `√(Σ sᵢ²)` under full Gaussian independence). The variance-sum formula is equivalent to assuming statistical independence, providing a lower bound on portfolio variability.

**In plain terms:** a 10-asset portfolio does not have 10× the forecast uncertainty of a single asset, because individual asset errors partially cancel. This formula expresses that diversification benefit with a conservative assumption.

---

## Multi-Source Reconciliation: Quadratic Confidence Weighting

When `n > 1` providers report the same quantity, a weighted blend is computed:

```
reconciled_value = Σᵢ (wᵢ × valueᵢ) / Σᵢ wᵢ

wᵢ = confidenceᵢ²
```

Quadratic weighting strongly downweights low-confidence sources. A provider at 50% confidence receives `0.25` relative weight against a provider at 90% confidence (`0.81`), meaning the low-confidence source contributes roughly 24% to the blend rather than 50%.

### When to Inspect This

If two providers disagree significantly and one has much lower confidence, the reconciled value will be pulled toward the higher-confidence source. The audit trace records both source values, their weights, and the reconciled result, so engineers can see how disagreement was resolved.

If all sources disagree and confidence is similar, the reconciled value may be in a region none of the sources individually reported. This is an engineering signal that provider inputs should be reviewed.

---

## Provider Disagreement Indication

When source values diverge by more than an internally-configured threshold, the reconciliation step adds a warning to the response. This surfaces provider disagreement to the engineer without discarding any source.

The `sources` block in every `/sites/evaluate` response shows each provider's status, freshness, and cache state. Stale or degraded providers will appear there with their degradation reason.

---

## Audit Trace Integration

Each reconciliation step is recorded in the pipeline audit trace:

```json
{
  "step": "reconcile_irradiance",
  "inputs": {
    "sources": [
      { "provider": "open_meteo", "value": 680.0, "confidence": 0.91 },
      { "provider": "nasa_power", "value": 712.0, "confidence": 0.74 }
    ],
    "n_sources": 2
  },
  "output": { "reconciled_value": 690.4, "weights": [0.828, 0.548] },
  "reasoning": "Weighted average of 2 sources using quadratic confidence weights"
}
```

This makes every reconciled value auditable and traceable back to its contributing providers.

---

## Implementation

See: `packages/predictive/src/dispatchlayer_predictive/reconciliation.py`
