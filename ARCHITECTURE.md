# Architecture

DispatchLayer is organized as an API plus dashboard around a shared predictive core.

## High-Level Components

1. Data layer
   - Archive weather/resource snapshots (hourly)
   - Site catalog with 10 demo sites

2. API layer (apps/api)
   - FastAPI routes for summary, timeseries, pipeline, forecasting, dispatch
   - Request-level composition of forecast, uncertainty, and trace artifacts

3. Dashboard layer (apps/dashboard)
   - Vue page flows for validation, forecast, and diagnostics
   - Forecast page combines proof signals and forward projection

4. Package layer (packages/*)
   - Domain entities, predictive math, dispatch logic, adapters/connectors

## Forecast Data Flow

1. Source summary loads site options.
2. Timeseries endpoint returns archive rows and units.
3. Pipeline endpoint returns projection and decision artifacts.
4. Dashboard computes:
   - modeled generation from weather/resource rows
   - monthly aggregates for training and holdout
   - holdout score and coverage metrics
   - FFT-based harmonic ranking

## Validation Guardrails

- Holdout leakage prevention: holdout months are never used in training profile.
- Forced holdout policy: 2025 when present in selected history window.
- Score integrity: if projection is missing, hit is null (not auto-true).
- Hit tolerance: 6% monthly relative error for holdout checks.

## Runtime Ports

- API: http://localhost:8000
- Dashboard: http://localhost:3000

## Key Limits

- timeseries hours max: 43800
- pipeline history_hours max: 43800

## Observability and Traceability

- Pipeline includes audit_trace and recommendation evidence.
- Dashboard exposes forecast bands plus input state and spectral signal tables.

