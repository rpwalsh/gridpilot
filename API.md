<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# API Guide

Base path: `/api/v1`

This guide describes API behavior in manager- and operations-friendly terms.

## How to Read This Guide

- This document explains endpoint purpose and operational behavior.
- OpenAPI (`/docs`, `/openapi.json`) remains the exact contract source for field-level schema.
- Where behavior can degrade due to unavailable providers or missing credentials, that is called out explicitly.

## Design Intent

- Read-oriented analytics and decision support
- Explicit source attribution and degraded-mode reporting
- Stable, typed JSON responses for dashboard clients

## Runtime Expectations

- All timestamps should be treated as UTC.
- Responses should include warnings when data quality or source state is degraded.
- Route handlers should not hide source failures behind synthetic success responses.
- Missing data should remain missing unless there is an explicitly documented fallback.

## Route Families in Codebase

Current route modules under `apps/api/src/dispatchlayer_api/routes`:
- anomalies
- audit
- connectors
- dispatch
- forecasts
- ingest
- predictive
- providers
- signals
- sites
- telemetry

## Endpoint Highlights

The following highlights cover operationally important routes used by current dashboard workflows.

## Connectors

### `GET /connectors/state`
Purpose:
- Show current read-state of configured connectors

Typical operators use this route to answer:
- Which protocol edges are healthy right now?
- Are sample streams arriving or stale?
- Which connectors are in error state and need escalation?

Expected response shape includes:
- timestamp
- connector list
- state per connector
- sample counts (when available)
- error markers (when failures occur)

### `GET /connectors/protocols`
Purpose:
- List supported connector protocols and intended use

Use this route for inventory/coverage checks and protocol visibility.

## Sites

### `POST /sites/evaluate`
Purpose:
- Evaluate site context for a selected window

Primary operational use:
- Assess expected site behavior for a near-term planning window
- Review confidence/trust and drift warnings before acting
- Capture source and warning context for shift handoff

Inputs (typical):
- site name and location
- asset type and capacity
- window hours
- optional context overrides

Outputs (typical):
- expected generation context (for example p10/p50/p90 fields)
- trust/confidence output
- drift summary
- source attribution list
- warnings list
- audit/decision trace block

Operational note:
- Live mode attempts provider calls; warnings should surface when providers are unavailable or unconfigured.

Operational caveat:
- In development/demo environments, some context can be backed by snapshots when live providers are unavailable.

## Telemetry

### `POST /telemetry/ingest`
Purpose:
- ingest one or more telemetry points

Behavior note:
- Intended for normalized point ingestion into internal telemetry workflows.

### `POST /telemetry/normalize`
Purpose:
- normalize raw telemetry into snapshot form

Behavior note:
- Normalization should preserve source identity and timestamp semantics.

### `GET /sites/{site_id}/telemetry/latest`
Purpose:
- latest telemetry snapshot(s) for one site

Operational use:
- Shift start checks and quick site-level state review.

### `GET /assets/{asset_id}/health`
Purpose:
- health summary for one asset

Operational use:
- Targeted investigation of assets that appear degraded in portfolio views.

## Additional Route Families (At a Glance)

- `providers`: provider state and availability context
- `forecasts`: forecast-oriented route surface
- `signals`: signal-level and feature context
- `predictive`: confidence/trust/drift related outputs
- `dispatch`: planning-support outputs (read-oriented)
- `anomalies`: anomaly-oriented diagnostics
- `audit`: traceability and event review support
- `ingest`: intake and import support routes

Exact endpoint lists and schemas should be taken from OpenAPI for your running build.

## Response Expectations

Every manager-facing endpoint should strive to include:
- usable values
- source state
- warnings when data quality or availability is degraded
- timestamps in UTC

## Source of Truth for Exact Schemas

Use running OpenAPI docs for your environment:
- `/docs`
- `/openapi.json`

This file explains behavior; OpenAPI defines exact contracts.

## Error and Degraded Mode Handling

Expected conditions:
- provider timeout/unavailable
- credential missing or invalid
- partial source windows
- connector-side protocol errors

Preferred response behavior:
- include warnings and source state in payload
- avoid ambiguous generic failures when partial value can be returned safely
- keep errors explicit enough for operator escalation

## Change Management Guidance

When adding or changing endpoints:

1. Update route tests and schema validation
2. Ensure degraded mode behavior is explicit
3. Verify dashboard compatibility
4. Document operational impact in this file and in OpenAPI descriptions
