# Dispatch Layer

Dispatch Layer is a utility-grade SCADA analysis console for renewable and grid-connected assets.

It provides an engine-room display for site state, telemetry integrity, asset behavior, provider context, forecast bands, and operational deviations. The system is designed for engineering review and utility operations environments where reliability, traceability, and data quality matter.

Dispatch Layer does not issue dispatch commands or scripted operational recommendations. It analyzes operational snapshots and source data, then presents inspectable findings, confidence bands, source attribution, and audit traces so engineers can verify how a site state was evaluated.

---

## Product Boundary

Dispatch Layer does not issue operational commands and does not prescribe grid-dispatch actions.

It analyzes telemetry, context, and derived state so engineers can understand:

- whether source data is fresh and complete
- whether asset telemetry is internally consistent
- whether production behavior matches current weather and site context
- whether provider inputs disagree
- whether a forecast should be treated as high-confidence or degraded
- whether SCADA data contains gaps, stale values, or abnormal transitions

The system is designed for analysis, validation, and engineering review.

---

## What It Analyzes

| Layer | Input | Output |
|-------|-------|--------|
| Signal Scoring | Weather, telemetry, grid, market signals with timestamps | Typed, time-decayed interaction scores |
| Structural State | Scored signals + asset metadata | Site structural state: capacity factor, data quality, derating risk |
| Forecast Context | Structural state + window duration | P10/P50/P90 production envelope, confidence decomposition |
| Drift Detection | Residual history | Regime-shift assessment: none / moderate / critical |
| Audit Trace | All of the above | Step-by-step inspection of every input, calculation, and output |

---

## System Architecture

```
Provider adapters (Open-Meteo, NASA POWER, NOAA NWS, NREL, EIA, ENTSO-E)
  → signal normalization
  → site structural state
  → forecast context (P10/P50/P90)
  → data-quality confidence scoring
  → structural drift detection
  → audit trace
  → FastAPI JSON response
  → React dashboard
```

The Python stack is structured as independent installable packages under `packages/`:

| Package | Role |
|---------|------|
| `dispatchlayer_domain` | Typed domain models: sites, assets, weather, telemetry |
| `dispatchlayer_predictive` | Analysis pipeline: signal scoring, structural state, forecast, drift |
| `dispatchlayer_forecasting` | P10/P50/P90 envelope computation |
| `dispatchlayer_anomaly` | Z-score telemetry deviation detection |
| `dispatchlayer_dispatch` | Battery dispatch window analysis |
| `dispatchlayer_recommendations` | Derived findings from anomaly detections |
| `dispatchlayer_adapter_*` | One adapter per external provider |

The API is a FastAPI application in `apps/api/`. The dashboard is a React/Vite application in `apps/dashboard/`.

---

## Local Development

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- Dashboard: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Without Docker

```bash
# Install Python packages
pip install -e packages/domain \
    -e packages/predictive \
    -e packages/forecasting \
    -e packages/anomaly \
    -e packages/dispatch \
    -e packages/recommendations \
    -e packages/adapters/open_meteo \
    -e packages/adapters/noaa_nws \
    -e packages/adapters/nasa_power \
    -e packages/adapters/nrel \
    -e packages/adapters/eia \
    -e packages/adapters/entsoe \
    -e apps/api

# Run API
uvicorn dispatchlayer_api.main:app --reload --port 8000

# Install and run dashboard
cd apps/dashboard && npm install && npm run dev
```

---

## Sample SCADA Fixtures

The repository includes offline fixtures representing renewable-site telemetry snapshots. These fixtures are used for deterministic local testing and reviewer reproducibility.

They are not scripted UI responses. The analysis path uses the same parsing, normalization, scoring, and audit-trace generation code used by the live API.

| Fixture | Contents |
|---------|----------|
| `packages/adapters/open_meteo/tests/fixtures/west_texas_wind_2025_06_05.json` | Open-Meteo hourly weather capture — wind speed, solar irradiance, temperature |
| `apps/api/tests/fixtures/scada_fleet_snapshot.json` | SCADA fleet snapshot — West Texas wind + Mojave solar, 2025-06-05T20:00Z |

The fleet snapshot fixture includes provenance metadata describing how each field was derived from published IEC 61400-1 power curve physics and NREL/ERCOT statistics.

---

## API Surface

```
GET  /health
GET  /providers
GET  /providers/health
POST /sites/evaluate        — full analysis pipeline: signal scoring → structural state → forecast context → drift detection → audit trace
GET  /telemetry/snapshot
POST /telemetry/ingest
POST /forecasts/site
POST /anomalies/detect
POST /dispatch/optimize
GET  /audit/traces
```

All endpoints return structured JSON with source attribution, data-mode indicators, and audit trace IDs.

---

## Dashboard Console

The dashboard is structured as an engine-room display:

| Screen | Purpose |
|--------|---------|
| System Overview | Provider availability, signal coverage, fleet-level data source status |
| Snapshot Analysis | Full analysis pipeline — signal scoring, forecast context, confidence, drift, audit trace |
| Telemetry | SCADA fleet view — actual vs. expected output, deviation analysis, fault codes |
| Asset State | Z-score deviation analysis per asset against physics model |
| Forecast Context | P10/P50/P90 production envelope for a given asset type and conditions |
| Dispatch Analysis | Battery dispatch window — net generation, demand, SoC context |
| Audit Trace | Full pipeline audit — every step, input, output, and reasoning |
| Provider Status | Live provider health probes — latency, freshness, configuration status |

---

## Testing

```bash
pytest --import-mode=importlib packages apps/api
```

The test suite validates provider adapter contracts, domain model integrity, and analysis pipeline correctness. All tests use recorded fixtures; no external calls are made.

---

## AWS Deployment Path

Dispatch Layer is designed for deployment as:

| Component | AWS Service |
|-----------|-------------|
| API | ECS Fargate behind Application Load Balancer |
| Dashboard | S3 + CloudFront |
| Scheduled ingestion | EventBridge → ECS task |
| Time-series storage | Timestream or Aurora/Postgres |
| Raw provider snapshots | S3 |
| Secrets | AWS Secrets Manager |
| Observability | CloudWatch Logs and metrics |
| Async jobs | SQS |

See `docs/aws-deployment.md` for architecture details.

---

## Data Model

Core domain types are defined in `packages/domain/src/dispatchlayer_domain/models.py`:

- `GeoPoint` — site coordinates
- `ForecastWindow` — analysis time window with resolution
- `WeatherSample` — normalized weather observation from any provider
- `AssetTelemetry` — normalized asset telemetry snapshot
- `AssetSnapshot` — extended SCADA asset state (IEC 61400-25 / IEC 61724-1 / BMS fields)

Provider adapters normalize their raw response shapes into these types before passing data to the analysis pipeline.

---

## Forecast Context

Dispatch Layer includes forecast context to help engineers compare current site behavior against expected production ranges.

Forecasting is not treated as an autonomous decision system. It is one input into the analysis pipeline, alongside telemetry freshness, provider agreement, weather context, asset metadata, and observed production behavior.

The output is an inspectable confidence band with a three-term error decomposition (structural error, predictive error, observational noise) and an audit trace. It is not an operational command.

---

## Audit Trace

Every analysis pipeline execution produces a full audit trace recording:

- which pipeline step ran
- what inputs were used
- what the output was
- what reasoning was applied
- which data mode was active (live / fixture / hybrid)
- which providers contributed data and at what freshness

Audit traces are returned in API responses and displayed in the dashboard timeline. They are designed to support engineering review and post-event analysis.

---

## Limitations

- No production authentication or multi-tenant model
- No persistent storage — each API call is stateless
- No live SCADA integration — real feeds must be ingested via `POST /api/v1/telemetry/ingest`
- AWS deployment is documented but not yet implemented as infrastructure-as-code
- Forecasting uses a deterministic physics-based model; no ML training pipeline is included

