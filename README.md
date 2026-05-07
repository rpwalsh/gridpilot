# DispatchLayer

DispatchLayer is an archive-first forecasting and decision-support stack for grid assets.
It combines weather/resource history, physics-informed generation modeling, uncertainty bands,
and operational recommendations.

## Current Data and Validation Posture

- Public demo dataset: 10 sites (5 solar, 5 wind)
- Time span: 2021-01-01 to 2025-12-31 (hourly)
- Max history window: 43800 hours (5 years)
- Forecast page holdout policy: force holdout year to 2025
- Forecast page training window: 2021-2024 when full 5-year history is selected
- Holdout hit metric: monthly projection is a hit when error <= 6%

## Product Surface

- API service (FastAPI): archive access, forecasting, scoring, dispatch, tracing
- Dashboard (Vue + Vite): validation, forecast bands, spectral diagnostics, lineage
- Python packages: domain model, dispatch, forecasting, predictive math, adapters

## Forecast Page Behavior (Aligned)

The Forecast page now exposes proof and prediction in one place:

- Validation Summary: holdout hit rate, P10/P90 coverage, training and holdout windows
- Forecast Bands:
  - Site state
  - Full input-state variable table
  - Forecast output table (next 24 steps with P10/P50/P90 and band width)
  - Identified spectral signals table (period, variance share, interpretation)
- Spectral Checks: harmonic decomposition and eigenvalue drift tables

## Repository Layout

- apps/api: FastAPI app and route layer
- apps/dashboard: Vue dashboard and page components
- packages: reusable core modules and adapters
- docs: analysis, policy, product boundary, and mathematics notes
- data: source snapshots and raw captures

## Start Here

1. Read QUICKSTART.md
2. Start API on port 8000
3. Start dashboard on port 3000
4. Open /forecast and select 5 y history

## Additional Docs

- API.md
- ARCHITECTURE.md
- DOMAIN_MODEL.md
- PYTHON_DEEPDIVE.md
- docs/analysis-guide.md
- docs/proofs-method.md

