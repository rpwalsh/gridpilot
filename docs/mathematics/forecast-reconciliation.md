# Forecast Reconciliation

## Purpose

Forecast reconciliation ensures that individual asset forecasts are consistent with portfolio-level constraints and that multiple data sources are blended into a coherent single forecast.

## Variance-Sum Method for Portfolio P10/P90

Given N assets each with symmetric spread `s_i = (p90_i − p10_i) / 2`, the portfolio spread is:

```
s_portfolio = √(Σᵢ sᵢ²)
p50_portfolio = Σᵢ p50_i
p10_portfolio = p50_portfolio − s_portfolio
p90_portfolio = p50_portfolio + s_portfolio
```

This models partial diversification: assets are neither perfectly correlated (which would give `Σ sᵢ`) nor perfectly independent (which would give `√(Σ sᵢ²)` under Gaussian assumptions). The variance-sum formula is equivalent to assuming independence, providing a lower bound on portfolio variability.

## Multi-Source Reconciliation

When `n_sources > 1` providers are available for the same quantity, a weighted blend is computed:

```
reconciled_value = Σᵢ (wᵢ × valueᵢ) / Σᵢ wᵢ

wᵢ = confidenceᵢ²
```

Quadratic weighting strongly downweights low-confidence sources.

## Decision Trace Integration

Each reconciliation step is recorded as a `TraceStep` in the `DecisionTrace`, with:
- `step = "reconcile_<field>"`
- `inputs = {source_values, weights, n_sources}`
- `output = reconciled_value`
- `reasoning = "Weighted average of <n> sources"`
