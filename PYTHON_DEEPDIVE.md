# Python Deep Dive

This document summarizes how Python components support the current API and dashboard behavior.

## Package Topology

- packages/domain: entities, types, value semantics
- packages/forecasting: forecast logic and uncertainty primitives
- packages/predictive: residual, confidence, attribution, reconciliation helpers
- packages/dispatch: dispatch optimization and recommendation logic
- packages/signals: signal-state construction and quality handling
- packages/adapters: provider adapters (open-meteo, nasa-power, noaa, eia, entsoe, nrel)

## API Route Responsibilities

- routes/telemetry.py
  - source summary
  - archive-backed site timeseries
  - telemetry ingest/normalize and asset health

- routes/sites.py
  - /sites/evaluate
  - /sites/{site_id}/pipeline with projection and audit artifacts

- routes/forecasts.py
  - site and portfolio forecast endpoints

- routes/predictive.py
  - confidence, reconciliation, causal attribution, residual endpoints

## Forecast Workflow in Code

1. Load archive rows for a site
2. Build modeled generation series from weather/resource signals
3. Aggregate monthly totals for training/holdout analysis
4. Build projection envelope (p10/p50/p90)
5. Expose artifacts through pipeline endpoint

## Validation Rules Reflected in Dashboard

- 5-year history enabled by 43800-hour cap
- holdout year forced to 2025 when present
- holdout excluded from training calculations
- holdout hit threshold set to 6%
- missing projections do not count as hits

## Local Development Notes

Use repo root as PYTHONPATH when launching API:

```powershell
$env:PYTHONPATH = "c:\Users\react\DispatchLayer"
c:/python314/python.exe -m uvicorn apps.api.src.dispatchlayer_api.main:app --port 8000
```

## Testing Focus

- endpoint contract stability for timeseries and pipeline
- holdout split integrity and non-leakage
- coverage metrics behavior under sparse/missing signals
- projection table consistency (p10 <= p50 <= p90)

