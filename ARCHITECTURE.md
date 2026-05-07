# Architecture

DispatchLayer is organized as an API plus dashboard around a shared predictive core.

## High-Level Components

1. Data layer
   - Archive weather/resource snapshots (hourly, Open-Meteo ERA5/ECMWF)
   - Site catalog with 10 demo sites (5 solar, 5 wind)
   - Source snapshots under `data/source_snapshots/`

2. API layer (apps/api)
   - FastAPI routes for summary, timeseries, pipeline, forecasting, dispatch,
     anomalies, signals, connectors, audit, and predictive primitives
   - Request-level composition of forecast, uncertainty, and trace artifacts
   - Auto-generated docs at `/docs` (Swagger) and `/redoc`

3. Dashboard layer (apps/dashboard)
   - Vue page flows for validation, forecast, and diagnostics
   - Forecast page combines proof signals and forward projection

4. Package layer (packages/*)
   - Domain entities, predictive math, dispatch logic, adapters/connectors
   - See PYTHON_DEEPDIVE.md for full topology

5. Connector layer (packages/connectors/*)
   - Read-only industrial-protocol connectors
   - OpenTelemetry/OTLP, OPC UA/SCADA, MQTT, AWS IoT SiteWise, S3/Parquet
   - Exposed via `GET /api/v1/connectors/state` and `/connectors/protocols`
   - All connectors fail soft: runtime errors are caught and reported as
     connector state `"ERROR"` without crashing the API

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
- Each API response embeds a DecisionTrace with trace_id, step inputs/outputs,
  reasoning strings, and model version tags.

## Makefile Quick Reference

| Target              | Description                                            |
|---------------------|--------------------------------------------------------|
| `make install`      | Install all Python packages (editable) + npm install   |
| `make api`          | Start API on port 8000                                 |
| `make dashboard`    | Start Vite dev server on port 3000                     |
| `make test`         | Run all Python tests                                   |
| `make lint-language`| Check for forbidden instrumentation-boundary terms     |
| `make frontend`     | Production build of the dashboard                      |
| `make verify`       | Full check: tests + lint + frontend build              |
| `make docker`       | Build and run via docker compose                       |
| `make snapshots-recommended` | Capture 5-year archive snapshots for all demo sites |

