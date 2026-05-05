# GridForge Architecture

## Overview

GridForge uses a hexagonal/ports-and-adapters architecture. The core domain is pure Python with no external dependencies. Adapters implement provider protocols. The API layer orchestrates across packages.

## Layers

```
┌─────────────────────────────────────────────┐
│                 Dashboard (React)            │
├─────────────────────────────────────────────┤
│              FastAPI (gridforge-api)         │
├──────────────┬──────────────────────────────┤
│ Forecasting  │ Anomaly │ Dispatch │ Recs     │
├──────────────┴──────────────────────────────┤
│         Walsh Predictive Core                │
├──────────────┬──────────────────────────────┤
│   Domain Models + Protocols                  │
├──────────────┴──────────────────────────────┤
│  Adapters: Open-Meteo │ NOAA │ NASA │ etc.  │
└─────────────────────────────────────────────┘
```

## Decision Traces

Every inference result includes a `decision_trace` with:
- `trace_id`: unique trace identifier
- `steps`: ordered list of reasoning steps with inputs/outputs
- `model_versions`: package versions used

## Provider Degradation

Adapters gracefully degrade:
- Missing API key → log warning, return empty result
- Rate limit → exponential backoff, then raise ProviderRateLimitError
- Schema error → raise ProviderSchemaError

## Walsh Predictive Core

The `walsh-predictive-core` package implements deterministic evidence-weighted reasoning:
- **SignalState**: normalizes and validates input signals
- **EvidenceGraph**: builds weighted evidence chains for hypotheses
- **CausalAttribution**: ranks causal hypotheses by evidence confidence
- **ForecastBounds**: computes p10/p50/p90 from historical error distributions
- **ReconciliationResult**: adjusts forecasts for bias and telemetry deviation
