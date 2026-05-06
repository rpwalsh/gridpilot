# Dispatch Layer

> **Dispatch Layer is a utility-grade instrumentation console for SCADA telemetry,
> forecast envelopes, residual fields, spectral transforms, temporal playback,
> source integrity, and audit metadata.**

Dispatch Layer renders measured and derived data surfaces.
It does not generate recommendations, findings, insights, summaries, reports,
instructions, action items, or natural-language interpretations.

---

## Product Boundary

See [docs/product-boundary.md](docs/product-boundary.md).

The hard constraint:

> The hard part is not drawing a forecast chart.
> The hard part is knowing whether the data behind the chart deserves to be trusted.

Every text string in the UI behaves like an instrument label, table header, field
name, unit, route title, status enum, or audit key.  No generated English prose.

---

## What It Renders

```
values              — numeric measurements with units
series              — time-ordered sequences
bands               — p10 / p50 / p90 forecast envelopes
deltas              — observed − expected
states              — NOMINAL / WATCH / HIGH / CRITICAL / STALE / MISSING / CONFLICT
timestamps          — source, server, ingest
threshold crossings — band violations, z-score thresholds
source status       — freshness, quality code, latency, integrity %
residuals           — signed error field
spectra             — harmonic amplitude by frequency
coherence           — frequency-domain agreement
coverage            — fraction of actuals inside forecast band
calibration         — bias, MAE, RMSE, MAPE
latency             — p50 / p95 / p99 ingest and API latency
integrity           — freshness, missingness, duplicate, conflict rates
audit hashes        — SHA-256 of data + config + model version
playback frames     — replayable historical state snapshots
```

---

## System Architecture

```
Provider adapters (Open-Meteo, NASA POWER, NOAA NWS, NREL, EIA, ENTSO-E)
  → signal normalization
  → site structural state
  → forecast envelope (P10/P50/P90)
  → data-quality confidence scoring
  → structural drift detection
  → audit trace
  → FastAPI JSON response
  → React dashboard (dark green + gold instrumentation theme)

Industrial connectors (read-only):
  OPC UA / MQTT / AWS IoT SiteWise / S3-Parquet / OpenTelemetry-OTLP
  → TelemetrySample (timestamp + quality + value + audit_hash)
  → connector state matrix (PipelineState page)
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
| `dispatchlayer_dispatch`               | Battery dispatch window analysis |
| `dispatchlayer_simulation`             | Physics simulation |
| `dispatchlayer_connector_otel`         | OpenTelemetry/OTLP platform observability |
| `dispatchlayer_connector_opcua`        | OPC UA read-only SCADA connector |
| `dispatchlayer_connector_mqtt`         | MQTT edge telemetry stream |
| `dispatchlayer_connector_sitewise`     | AWS IoT SiteWise asset properties |
| `dispatchlayer_connector_parquet`      | S3/Parquet historical archive replay |
| `dispatchlayer_adapter_*`              | One adapter per external weather/grid provider |

See [docs/connector-strategy.md](docs/connector-strategy.md).

---

## Read-Only Connector Boundary

All industrial connectors are read-only.  No operational command path is
implemented.  Dispatch Layer subscribes, reads, queries, and replays.
It does not write, command, or dispatch.

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

The `lint-language` step greps source files for forbidden instrumentation boundary
terms (`recommendation`, `finding`, `insight`, `suggest`, `advice`, etc.).
It fails the build if any are found outside the allowlisted docs.

---

## API Surface

```
GET  /health
GET  /providers
GET  /providers/health
GET  /connectors/state          — connector matrix
GET  /connectors/protocols
POST /sites/evaluate
GET  /telemetry/snapshot
POST /telemetry/ingest
POST /forecasts/site
POST /anomalies/detect          — returns deviation_detected + DeviationEvent
POST /signals/evaluate          — returns SignalEvent list with ThresholdState
POST /dispatch/optimize
GET  /audit/traces
```

---

## Dashboard Pages

| Page             | Renders |
|------------------|---------|
| System Overview  | Provider availability, signal coverage, source state |
| Snapshot Analysis| Signal scoring, forecast context, confidence, drift, audit trace |
| Telemetry        | SCADA fleet — actual vs. expected, deviation events, fault codes |
| Asset State      | Z-score deviation per asset vs. physics-model expected |
| Forecast Envelope| P10/P50/P90 production envelope |
| Dispatch Analysis| Battery dispatch window — net generation, demand, SoC context |
| Audit Trace      | Full pipeline audit — step, input, output, data mode, provider |
| Source State     | Provider health — latency, freshness, configuration |
| Proofs           | Holdout validation — forecast bands, residual field, spectral agreement, temporal playback helix |
| Pipeline State   | Connector matrix — OPC UA / MQTT / SiteWise / OTel / Parquet state |

---

## Proofs (Holdout Validation)

The Proofs page is a blind holdout validation surface:

1. Train / calibrate on **2000–2024 data only**
2. Generate P10/P50/P90 bands without seeing 2025 actuals
3. Overlay actual 2025 series for post-hoc validation
4. Report: coverage, RMSE, MAE, MAPE, bias, spectral agreement
5. Render: temporal playback signature helix (365 × 24 h deviation field)

The point is not to claim prediction.  It is to prove calibration.

---

## Testing

```bash
pytest --import-mode=importlib -q
```

All tests use recorded fixtures.  No external calls are made.

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

