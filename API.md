# API Reference (Current)

Base URL: /api/v1

This reference covers all registered endpoints.

## Health

- GET /health          (root-level alias)
- GET /api/v1/health

Both return `{"status": "ok", "service": "dispatchlayer-api", "version": "0.1.0"}`.

## Overview

- GET /overview/source-summary

Returns the dataset catalog, site list, coverage dates, total hourly points, and
a `power_data_status` block describing what measured vs. modeled data is available.

## Timeseries

- GET /timeseries/{site_id}?hours={1..43800}

Returns archive rows and `hourly_units` for a site. All values are Open-Meteo
ERA5/ECMWF reanalysis data. No synthetic or interpolated values are added.

Common fields per row:

- temperature_2m
- wind_speed_10m, wind_speed_80m, wind_speed_120m
- wind_direction_10m, wind_gusts_10m
- shortwave_radiation, direct_normal_irradiance, diffuse_radiation
- cloud_cover, cloud_cover_low, cloud_cover_mid, cloud_cover_high
- relative_humidity_2m, precipitation, pressure_msl, vapour_pressure_deficit

## Sites

- POST /sites/evaluate

  Live evaluation using real provider calls (Open-Meteo). Returns forecast context,
  data-quality confidence, structural drift warning, and audit trace. Every response
  includes a `sources` block with attribution, freshness, and degraded-mode warnings.

- GET /sites/{site_id}/pipeline?history_hours={24..43800}&horizon_hours={24..}

  Archive-backed pipeline for a known demo site. Returns:

  - current_signals and normalized_signals
  - residuals and structural_drift
  - projection array with ts, p10, p50, p90
  - recommendations and audit_trace

## Telemetry

- POST /telemetry/ingest

  Ingest raw TelemetryPoint records. In the public demo, writes to an in-process
  list (not persisted across restarts).

- POST /telemetry/normalize

  Normalise raw TelemetryPoint records into AssetTelemetrySnapshot summaries grouped
  by (site_id, asset_id, asset_type).

- GET /sites/{site_id}/telemetry/latest?data_mode={source|live}

  Latest AssetTelemetrySnapshot per asset at the site.
  `data_mode=source` loads from `data/source_snapshots/*.json`.
  `data_mode=live` returns from the in-process ingest store.

- GET /assets/{asset_id}/health?data_mode={source|live}

  Health summary for a single asset including snapshot and anomaly residual.

## Forecasts

- POST /forecasts/site

  Single-site point forecast with P10/P50/P90 bounds and decision trace.
  Supports `asset_type`: `wind_turbine` (requires `wind_speed_mps`) or
  `solar_inverter` (requires `ghi_wm2`).

- POST /forecasts/portfolio

  Aggregates site forecasts into portfolio P10/P50/P90 in MWh using
  quadrature-sum spread combination across sites.

## Dispatch

- POST /dispatch/optimize

  Battery dispatch decision (charge / discharge / hold) based on SoC,
  price signals, solar generation forecast, and demand forecast.
  Returns action, target SoC, estimated revenue, cycle cost, and decision trace.

## Anomalies

- POST /anomalies/detect

  Detect generation anomaly for a single asset. Returns deviation flag,
  condition, residual percentage, causal hypotheses, and decision trace.

- GET /anomalies/conditions

  List all supported AnomalyCondition enum values.

## Signals

- POST /signals/evaluate

  Multi-asset signal evaluation. Runs anomaly detection across a list of assets
  and returns ranked SignalEvent records with threshold state and audit hash.

- GET /signals/states

  List all ThresholdState enum values.

## Predictive (prefix: /predictive)

- POST /predictive/signal-state

  Normalise a set of named signals. Returns per-signal confidence, missing flag,
  and anomalous flag after range validation.

- POST /predictive/residual

  Compute absolute delta, percent delta, direction, and significance for an
  expected vs. actual value pair.

- POST /predictive/forecast-bounds

  Compute P10/P50/P90 bounds from a point forecast and optional historical error
  distribution. P10/P90 use ±1.28σ around P50.

- POST /predictive/reconcile

  Apply historical bias correction and optional telemetry adjustment to a raw
  forecast. Returns adjusted forecast and confidence.

- POST /predictive/causal-attribution

  Attribute underproduction to ranked causal hypotheses for `wind_turbine` or
  `solar_inverter` assets using evidence graphs.

- POST /predictive/confidence

  Aggregate evidence-node weights into a hypothesis confidence score.

## Providers

- GET /providers

  List all configured providers and whether their API key is set.

- GET /providers/health

  Live reachability probe for key-free providers (Open-Meteo, NASA POWER,
  NOAA/NWS). Key-gated providers (NREL, EIA, ENTSO-E) report `unconfigured`
  when no key is set.

## Ingest

- POST /ingest/weather

  Fetch a weather forecast window from a named provider (currently supports
  `open_meteo`). Returns timestamped samples.

## Connectors

- GET /connectors/state

  Current state of all platform connectors: OTEL, OPC UA, MQTT, AWS SiteWise,
  S3/Parquet. Each connector probe runs at call time with no fixture mode.
  Returns state, sample count, and error type on failure.

- GET /connectors/protocols

  List all supported connector protocols with purpose and read-only flag.

## Audit

- GET /audit/trace/{trace_id}

  Placeholder. Traces are currently embedded inline in each API response.
  Persistent trace lookup requires a database backend.

## Forecast Page Data Dependencies

The dashboard Forecast page primarily uses:

1. GET /overview/source-summary
2. GET /timeseries/{site_id}
3. GET /sites/{site_id}/pipeline

## Validation Semantics (Dashboard)

- Holdout year is forced to 2025 when available
- Training months exclude holdout months
- Hit metric for holdout month: abs(projected - actual) / actual <= 0.06
- P10/P90 coverage computed over modeled hourly series

