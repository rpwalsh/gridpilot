# Dispatch Layer

Dispatch Layer is a view-only plant data display for utility and renewable operations.

It is built as the reference application for [`risklab-ui`](https://github.com/rpwalsh/risklab-ui) and [`risklab-charts`](https://github.com/rpwalsh/risklab-charts) — a visual system for rendering high-density operational data: SCADA telemetry, source status, forecast bands, residual fields, signal patterns, temporal replay, and source records.

Forecasting is one supported data surface. The product center is visualization: making complex plant and grid data visible, replayable, and inspectable without generating operator instructions, automated language output, or tasking lists.

---

## Built on RiskLab

Dispatch Layer applies the RiskLab visual stack to utility and plant data:

| Layer | Role |
|---|---|
| [`risklab-ui`](https://github.com/rpwalsh/risklab-ui) | Application shell, panels, metric rails, source tables, field grids, status surfaces, playback controls, workbench layout |
| [`risklab-charts`](https://github.com/rpwalsh/risklab-charts) | Time-series charts, forecast bands, heatmaps, residual fields, spectral plots, coherence views, coverage bars, replay and signal charts |
| Dispatch Layer | Utility/plant domain implementation: SCADA telemetry, source connectors, back-test, signal patterns, audit records |

So the stack story is:

```
risklab-ui      — visual grammar and application shell
risklab-charts  — charting and instrument surfaces
Dispatch Layer  — utility/SCADA plant-data reference application
```

---

## What It Shows

```
Live plant values         — numeric measurements with units
Data freshness            — source age, quality codes, stale flags
Source status             — provider health, latency, integrity
Forecast bands            — p10 / p50 / p90 forecast envelopes
Actual vs expected        — observed − model, direction, magnitude
Replay                    — replayable historical state by interval
Signal patterns           — repeating structure, seasonal cycles
Event log                 — threshold crossings and deviation events
Source records            — provider, capture time, query, hash
```

---

## Product Boundary

Dispatch Layer is view-only. It does not control equipment, write setpoints, issue dispatch instructions, or generate automated language output.

The hard constraint:

> The hard part is not drawing a forecast chart.
> The hard part is knowing whether the data behind the chart deserves to be trusted.

Every text string in the UI behaves like an instrument label, table header, field name, unit, status enum, or audit key. No generated prose.

See [docs/product-boundary.md](docs/product-boundary.md).

---

## Visual Surfaces

Dispatch Layer uses `risklab-charts` to render multiple utility-grade data surfaces:

- Telemetry time series
- Forecast bands
- Residual fields
- Source quality heatmaps
- Signal patterns
- Coverage bars
- Temporal replay
- Source-state matrices
- Threshold overlays
- Source record tables

Then forecasting is one bullet, not the headline.

---

## Dashboard Pages

| Page           | Renders |
|----------------|---------|
| Overview       | Provider availability, signal coverage, source state |
| Asset State    | Z-score deviation per asset vs. physics-model expected |
| Live Data      | SCADA fleet — actual vs. expected, deviation events, fault codes |
| Forecast Band  | P10/P50/P90 production envelope |
| Back-Test      | Holdout validation — forecast bands, residual field, signal patterns |
| Site Analysis  | Signal scoring, forecast context, confidence, drift, audit trace |
| Storage State  | Battery window — net generation, demand, SoC context |
| Source Status  | Provider health — latency, freshness, configuration |
| Sources        | Connector matrix — OPC UA / MQTT / SiteWise / OTel / Parquet state |
| Source Record  | Full pipeline audit — step, input, output, data mode, provider |

---

## Back-Test (Holdout Validation)

The Back-Test page renders from real cached source snapshots, not live API calls:

1. Load a real weather/grid source snapshot from `data/source_snapshots/`
2. Split into training window and holdout window
3. Compute forecast bands from training data only
4. Overlay holdout actuals for post-hoc validation
5. Render: coverage, RMSE, MAE, MAPE, bias, signal patterns

To capture a real weather snapshot:

```bash
python scripts/capture_weather_snapshot.py \
  --lat 31.97 \
  --lon -102.08 \
  --start 2000-01-01 \
  --end 2024-12-31 \
  --out data/source_snapshots/weather/open_meteo_west_texas_2000_2024.json
```

See `data/source_snapshots/weather/README.md`.

---

## System Architecture

```
Provider adapters (Open-Meteo, NASA POWER, NOAA NWS, NREL, EIA, ENTSO-E)
  → signal normalization
  → site structural state
  → forecast band (P10/P50/P90)
  → data-quality confidence scoring
  → structural drift detection
  → audit trace
  → FastAPI JSON response
  → React dashboard (dark green + gold instrumentation theme)

Industrial connectors (read-only):
  OPC UA / MQTT / AWS IoT SiteWise / S3-Parquet / OpenTelemetry-OTLP
  → TelemetrySample (timestamp + quality + value + audit_hash)
  → connector state matrix (Source Status page)
```

---

## Package Layout

| Package                                | Role |
|----------------------------------------|------|
| `dispatchlayer_domain`                 | Typed domain models: sites, assets, telemetry, quality |
| `dispatchlayer_predictive`             | Signal scoring, structural state, forecast, drift |
| `dispatchlayer_forecasting`            | P10/P50/P90 envelope computation |
| `dispatchlayer_anomaly`                | Z-score deviation detection → `DeviationEvent` |
| `dispatchlayer_signals`                | `SignalEvent` + `ThresholdState` evaluator |
| `dispatchlayer_dispatch`               | Battery storage state analysis |
| `dispatchlayer_simulation`             | Physics simulation |
| `dispatchlayer_connector_otel`         | OpenTelemetry/OTLP platform observability |
| `dispatchlayer_connector_opcua`        | OPC UA read-only SCADA connector |
| `dispatchlayer_connector_mqtt`         | MQTT edge telemetry stream |
| `dispatchlayer_connector_sitewise`     | AWS IoT SiteWise asset properties |
| `dispatchlayer_connector_parquet`      | S3/Parquet historical archive replay |
| `dispatchlayer_adapter_*`              | One adapter per external weather/grid provider |

See [docs/connector-strategy.md](docs/connector-strategy.md).

---

## Source Snapshots

Dispatch Layer does not use mock proof data.

Back-Test views are rendered from cached source snapshots captured from real provider APIs or exported operational archives. Cached snapshots are used so the application remains deterministic, reproducible, and does not repeatedly call external APIs during review.

Each source snapshot includes provider metadata, query parameters, capture time, schema version, record count, and content hash.

See `data/source_snapshots/weather/README.md`.

---

## Local Development

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- Dashboard: http://localhost:3000
- API docs:  http://localhost:8000/docs
- Health:    http://localhost:8000/health

### Without Docker

```bash
make install
make api         # terminal 1 — FastAPI on :8000
make dashboard   # terminal 2 — Vite on :5173
```

---

## Verification

```bash
make verify   # pytest + lint-language (forbidden-term check) + frontend build
```

The `lint-language` step greps source files for forbidden instrumentation boundary terms. It fails the build if any are found outside the allowlisted docs.

---

## API Surface

```
GET  /health
GET  /providers
GET  /providers/health
GET  /connectors/state          — connector matrix
GET  /connectors/protocols
POST /sites/evaluate            — L→G→P pipeline evaluation
POST /forecasts/site
POST /anomalies/detect          — returns deviation_detected + DeviationEvent
POST /signals/evaluate          — returns SignalEvent list with ThresholdState
POST /dispatch/optimize         — battery storage state analysis
GET  /audit/trace/{trace_id}
```

---

## Testing

```bash
make test
```

All tests use recorded fixtures. No external calls are made.

---

## AWS Deployment Path

| Component              | AWS Service |
|------------------------|-------------|
| API                    | ECS Fargate + ALB |
| Dashboard              | S3 + CloudFront |
| Scheduled ingestion    | EventBridge → ECS task |
| Time-series storage    | Timestream or Aurora/Postgres |
| Raw provider snapshots | S3 |
| Secrets                | AWS Secrets Manager |
| Observability          | CloudWatch + OpenTelemetry/OTLP |
| Async jobs             | SQS |
| Industrial connectors  | OPC UA / MQTT / SiteWise Edge |

---

## Limitations

- No production authentication or multi-tenant model
- No persistent storage — each API call is stateless
- No live SCADA integration — real feeds ingested via `POST /telemetry/ingest`
- Forecasting uses a deterministic physics-based model; no ML training pipeline
- Connector clients are fixture-mode only; live adapters are Phase 2/3

