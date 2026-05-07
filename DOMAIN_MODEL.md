# Domain Model

This model describes the core concepts used by API and dashboard.

## Primary Entities

## Site

- site_id
- name
- asset_type (solar or wind)
- region, latitude, longitude
- capacity_mw

## TimeseriesSample

- ts (UTC)
- weather/resource signals (temperature, wind, irradiance, cloud, humidity, precipitation, pressure)
- unit metadata via hourly_units

## ModeledOutput

- observed_mw (weather-to-power estimate for dashboard analysis)
- expected baseline per hour
- residual = observed - expected

## ProjectionPoint

- ts
- p10
- p50
- p90

## HoldoutEvaluation

- holdout_year (forced to 2025 when available)
- training_months and holdout_months
- monthly projected vs actual
- error_pct
- hit flag (true when error <= 6%)

## SpectralSignal

- label
- period_h
- amplitude
- variance_share_pct
- interpretation

## PipelineArtifact

- current_signals
- normalized_signals
- residuals
- structural_drift
- recommendations
- audit_trace

## Relationships

- Site has many TimeseriesSample
- Site has many ProjectionPoint
- HoldoutEvaluation is derived from Site monthly aggregates
- SpectralSignal is derived from modeled output history
- PipelineArtifact links projection and explainability outputs

