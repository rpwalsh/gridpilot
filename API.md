# API Reference (Current)

Base URL: /api/v1

This reference focuses on the endpoints used in the aligned forecasting workflow and dashboard.

## Core Read Endpoints

- GET /health
- GET /overview/source-summary
- GET /providers
- GET /providers/health
- GET /timeseries/{site_id}?hours={1..43800}
- GET /sites/{site_id}/pipeline?history_hours={24..43800}&horizon_hours={24..}
- GET /assets/{asset_id}/health

## Core Write/Compute Endpoints

- POST /forecasts/site
- POST /forecasts/portfolio
- POST /dispatch/optimize
- POST /sites/evaluate
- POST /signals/evaluate
- POST /anomalies/detect

## Forecast Page Data Dependencies

The dashboard Forecast page primarily uses:

1. GET /overview/source-summary
2. GET /timeseries/{site_id}
3. GET /sites/{site_id}/pipeline

## Timeseries Contract Notes

- rows are hourly samples with weather/resource signals
- hourly_units provides per-field units for display
- expected max demo window is 43800 hours (5 years)

Common fields:

- temperature_2m
- wind_speed_10m, wind_speed_80m, wind_speed_120m
- wind_direction_10m, wind_gusts_10m
- shortwave_radiation, direct_normal_irradiance, diffuse_radiation
- cloud_cover, cloud_cover_low, cloud_cover_mid, cloud_cover_high
- relative_humidity_2m, precipitation, pressure_msl

## Pipeline Contract Notes

Pipeline response contains:

- current_signals and normalized_signals
- residuals and structural_drift
- projection array with ts, p10, p50, p90
- recommendations and audit_trace

The Forecast Bands table is derived directly from projection values and latest timeseries row.

## Validation Semantics (Dashboard)

- Holdout year is forced to 2025 when available
- Training months exclude holdout months
- Hit metric for holdout month: abs(projected - actual) / actual <= 0.06
- P10/P90 coverage computed over modeled hourly series

