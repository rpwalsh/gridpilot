# Python Deep Dive

This document summarizes how Python components support the current API and dashboard behavior.

## Package Topology

Core domain and math:

- packages/domain: entities, types, value semantics, telemetry models
- packages/forecasting: solar irradiance model, wind power curve, portfolio forecast aggregation
- packages/predictive: residual, confidence, attribution, reconciliation, structural drift, L/G/P/D pipeline layers
- packages/dispatch: battery dispatch optimization and recommendation logic
- packages/signals: signal-state construction, quality handling, event ranking
- packages/anomaly: anomaly detection and condition classification
- packages/simulation: Monte Carlo simulation utilities
- packages/recommendations: ranking and recommendation engine

Provider adapters:

- packages/adapters/open_meteo: Open-Meteo weather/archive adapter
- packages/adapters/nasa_power: NASA POWER historical irradiance adapter
- packages/adapters/noaa_nws: NOAA/NWS public weather adapter
- packages/adapters/nrel: NREL adapter (API key required)
- packages/adapters/eia: EIA grid data adapter (API key required)
- packages/adapters/entsoe: ENTSO-E European grid adapter (API key required)

Connector packages (industrial protocol adapters, read-only):

- packages/connectors/opentelemetry: OTLP collector connector
- packages/connectors/opcua: OPC UA / SCADA connector
- packages/connectors/mqtt: MQTT edge-gateway connector
- packages/connectors/sitewise: AWS IoT SiteWise connector
- packages/connectors/parquet: S3/Parquet historical archive connector

## API Route Responsibilities

- routes/telemetry.py
  - source summary (`GET /overview/source-summary`)
  - archive-backed site timeseries (`GET /timeseries/{site_id}`)
  - telemetry ingest and normalize (`POST /telemetry/ingest`, `POST /telemetry/normalize`)
  - site telemetry latest snapshot (`GET /sites/{site_id}/telemetry/latest`)
  - asset health (`GET /assets/{asset_id}/health`)

- routes/sites.py
  - live site evaluation with provider call (`POST /sites/evaluate`)
  - archive-backed pipeline with projection and audit artifacts (`GET /sites/{site_id}/pipeline`)

- routes/forecasts.py
  - single-site forecast (`POST /forecasts/site`)
  - portfolio aggregate forecast (`POST /forecasts/portfolio`)

- routes/predictive.py
  - signal normalization, residual, forecast bounds, reconciliation,
    causal attribution, confidence scoring
  - all under `/predictive/*` prefix

- routes/anomalies.py
  - anomaly detection (`POST /anomalies/detect`)
  - condition list (`GET /anomalies/conditions`)

- routes/signals.py
  - multi-asset signal evaluation (`POST /signals/evaluate`)
  - state list (`GET /signals/states`)

- routes/dispatch.py
  - battery dispatch optimization (`POST /dispatch/optimize`)

- routes/providers.py
  - provider list and live health probes (`GET /providers`, `GET /providers/health`)

- routes/ingest.py
  - weather data ingest via provider (`POST /ingest/weather`)

- routes/connectors.py
  - connector state (`GET /connectors/state`)
  - protocol list (`GET /connectors/protocols`)

- routes/audit.py
  - trace lookup stub (`GET /audit/trace/{trace_id}`)
  - traces are currently embedded inline in each response; persistent storage requires a database backend

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

## Local Development

Install all packages and start services via the Makefile:

```bash
make install   # editable pip installs + npm install
make api       # uvicorn on port 8000
make dashboard # Vite dev server on port 3000
make verify    # tests + language lint + frontend build
```

To run the API manually, ensure the repo root is on `PYTHONPATH`:

```bash
# Linux / macOS
PYTHONPATH=$(pwd) uvicorn apps.api.src.dispatchlayer_api.main:app --port 8000

# Windows PowerShell
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn apps.api.src.dispatchlayer_api.main:app --port 8000
```

## Testing Focus

- endpoint contract stability for timeseries and pipeline
- holdout split integrity and non-leakage
- coverage metrics behavior under sparse/missing signals
- projection table consistency (p10 <= p50 <= p90)

