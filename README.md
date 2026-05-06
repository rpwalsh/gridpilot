<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# DispatchLayer

DispatchLayer is an operations analytics platform for renewable power portfolios.

Audience:
- Plant managers
- Regional operations managers
- Reliability and planning teams
- Engineers supporting telemetry and forecasting workflows

This repository is designed to support practical operational decisions. It is not a marketing site and it is not a research paper archive.

## Dashboard Preview

![DispatchLayer dashboard preview](Screenshot%202026-05-06%20093938.png)

## Software Summary

DispatchLayer helps operations teams answer four recurring questions:

1. Are our data sources healthy and trustworthy right now?
2. Are site conditions changing in ways that increase operational risk?
3. How much confidence should we place in forecast context for planning windows?
4. What changed, and can we trace how the system reached a recommendation?

The software is intentionally read-oriented: it aggregates context, evaluates data quality, and exposes transparent diagnostics for operational decision support.

## Core Capabilities

- Source visibility: connected/auth-required/cached/error state surfaced in API and dashboard views
- Telemetry normalization: route-level logic to ingest/normalize source telemetry into practical snapshot forms
- Forecast context views: bands, residual behavior, chart analysis, and trend exploration
- Confidence and drift signals: manager-friendly indicators that highlight changing reliability
- Decision traceability: structured output intended for audit/debug review
- Connector observability: protocol-level status visibility (MQTT, OPC UA, OTEL, SiteWise, Parquet)

## What DispatchLayer Does Today

- Aggregates source status across public and integration-facing providers
- Exposes API endpoints for telemetry context, site evaluation, connectors, and forecasting views
- Provides dashboard pages for source visibility, chart exploration, forecast bands, and replay/history views
- Surfaces degraded mode explicitly (for example missing API credentials or provider outage)

## What DispatchLayer Does Not Do Today

- It does not control plant equipment
- It does not place market bids
- It does not replace SCADA, EMS, or historian systems
- It does not guarantee forecast outcomes

## Current Realism Level (Truthful Status)

- Some API routes are wired to real public provider clients (for example Open-Meteo workflows)
- Some route behavior is backed by local snapshot files under `data/source_snapshots` and `data/raw/curl/production_demo`
- Some dashboard chart views use generated demo series for interaction and layout validation
- Connector status endpoints are read-oriented and intended for visibility, not command execution

If you need full production-grade integration behavior, use this repo as a baseline and complete your site-specific connector and governance requirements.

## System Architecture (Plain English)

DispatchLayer has two runtime applications and shared package layers:

- Dashboard (`apps/dashboard`): presents operations-facing pages for source status, analytics, and forecast interpretation
- API (`apps/api`): FastAPI service that composes route responses from package logic, adapters, connectors, and snapshots
- Shared packages (`packages/*`): domain models plus forecasting/predictive/signal/anomaly/recommendation modules
- Integration edges:
	- Adapters (`packages/adapters/*`) for provider APIs
	- Connectors (`packages/connectors/*`) for protocol/system edges

Normal request flow:

1. User opens dashboard page
2. Dashboard requests API route
3. Route resolves data from providers/connectors/snapshots
4. Route returns values + warnings + source attribution
5. Dashboard renders context and quality state

## Operational Workflow

Typical manager workflow using DispatchLayer:

1. Open source status and verify active vs degraded feeds
2. Review site telemetry snapshots and health indicators
3. Check bands/residual charts for instability or drift patterns
4. Review confidence output before planning action
5. Record decision with source and warning context

Recommended escalation triggers:

- Sudden sustained confidence drop
- Multi-source outage or stale data windows
- Residual regime shift over consecutive intervals
- Connector error state across critical feeds

## API Surface (At a Glance)

Base path: `/api/v1`

Key route families in code:

- telemetry
- sites
- forecasts
- providers
- connectors
- predictive
- dispatch
- signals
- anomalies
- audit
- ingest

Important behavior rules:

- Responses should include explicit warnings for degraded mode
- Source attribution should remain visible
- UTC timestamps are expected across route payloads
- Missing fields should remain missing, not silently fabricated

## Data Model and Quality Posture

Data classes in this repository:

- Raw captures: `data/raw/*`
- Normalized snapshots: `data/source_snapshots/*`
- Runtime response payloads from API routes

Quality principles:

- Preserve provenance
- Keep units explicit where practical
- Separate observed values from derived/model values
- Treat confidence as guidance, not certainty

## Monorepo Layout

- `apps/api`: FastAPI service and route layer
- `apps/dashboard`: React dashboard
- `packages/domain`: core domain models and contracts
- `packages/predictive`: scoring, trust, drift, decision trace support
- `packages/forecasting`, `packages/signals`, `packages/anomaly`, `packages/recommendations`, `packages/dispatch`, `packages/simulation`: domain capabilities
- `packages/connectors/*`: protocol/system connectors (MQTT, OPC UA, OTEL, SiteWise, Parquet)
- `packages/adapters/*`: provider adapters
- `docs`: product and operations documentation
- `scripts`: capture and demo prep scripts
- `data`: raw captures and normalized snapshots

## Local Run (Short Version)

1. Install Python packages for API and shared modules
2. Install dashboard dependencies
3. Start API from repo root
4. Start dashboard from `apps/dashboard`
5. Open dashboard and API docs endpoints

Full commands are in `QUICKSTART.md`.

## Production Readiness Notes

This repository is a professional preview baseline, not a turnkey production system.

Before production rollout, ensure:

- AuthN/AuthZ and role policy
- Secret management and rotation
- Network and egress controls
- SLOs, monitoring, and alerting
- Audit retention and incident procedures
- Site-specific connector hardening and failover behavior

## Start Here

1. Read `QUICKSTART.md` and run API + dashboard locally
2. Read `ARCHITECTURE.md` to understand system boundaries
3. Read `API.md` for endpoint responsibilities
4. Read `docs/analysis-guide.md` for manager-facing workflow

## Documentation Principles Used in This Repo

- Write to operators first
- Say what is implemented now, not what might exist later
- Keep degraded mode visible
- Prefer runbooks and checklists over abstract theory

## Access and Usage Terms

This repository is proprietary internal code provided as a professional preview.

No license is granted for use, redistribution, modification, or production deployment unless explicitly authorized in writing by the code owner.
