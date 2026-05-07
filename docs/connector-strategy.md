# Connector Strategy

This document defines connector expectations for DispatchLayer's archive-first workflow.

## Strategy Principles

- Prefer deterministic, replayable archive snapshots for proof runs.
- Keep provider-specific logic in adapters, not in domain logic.
- Preserve units and source provenance per field.
- Fail soft with explicit degraded metadata when providers are unavailable.

## Current Provider Footprint

- Open-Meteo (archive and forecast weather/resource)
- NASA POWER (historical irradiance/weather)
- NOAA/NWS (weather and related public signals)
- Optional market/system sources via adapters

## Contract Requirements

Each connector should produce:

- timestamped values in UTC
- field-level units
- source and retrieval metadata
- null-safe values for missing fields

## Operational Notes

- Dashboard forecast workflow depends on stable hourly fields in timeseries.
- Spectral diagnostics are sensitive to irregular gaps and timestamp drift.
- Connector changes should be validated against 5-year windows where possible.

## Testing Checklist

- schema compatibility with timeseries route
- unit map completeness
- monotonic timestamp order
- graceful behavior on partial outages

