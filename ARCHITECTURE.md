<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Architecture

This document explains the implementation architecture in plain operational language.

## Intended Reader

- Operations and plant leadership who need system boundaries and reliability expectations
- Engineering teams responsible for implementation and support
- Architecture reviewers evaluating deployment readiness

## 1) System Goal

Provide a reliable read-oriented layer that helps operations teams answer:
- Are our data sources healthy?
- Are site conditions changing in ways that affect planning?
- How much confidence should we place in current forecast context?

DispatchLayer is designed as a decision-support and observability layer, not as a direct command/control system.

## 2) Topology

Main components:
- Dashboard UI (`apps/dashboard`)
- API service (`apps/api`)
- Domain and predictive packages (`packages/*`)
- Integration edges (adapters and connectors)
- Local snapshot store for reproducible demo and development (`data/*`)

Typical request path:
1. User opens dashboard view
2. Dashboard calls API route
3. Route gathers data from package logic + provider/connector clients + snapshots when needed
4. Route returns typed JSON with attribution and warning fields
5. Dashboard renders result and status

## 3) Component Interaction Model

### Dashboard to API

- Dashboard pages call route families by concern (sources, telemetry, forecasts, analytics).
- UI rendering depends on both values and status metadata (warnings/source state).

### API to Domain/Predictive Packages

- Route handlers orchestrate package calls.
- Domain packages provide shared semantics and model contracts.
- Predictive packages provide confidence, drift, and trace-oriented outputs.

### API to Adapters/Connectors

- Adapters access external data providers.
- Connectors access protocol/system edges.
- Both are treated as potentially degraded dependencies.

### Snapshot/Raw Data Dependencies

- Snapshot-backed workflows support reproducible local behavior.
- Raw capture artifacts support evidence and data provenance.

## 4) API Layer Responsibilities

API route handlers are responsible for:
- Input validation
- Calling domain/predictive services
- Calling adapters/connectors where configured
- Returning explicit source status and warnings

Key route groups currently present:
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

API quality contract:
- explicit warnings on degraded data paths
- source attribution included in responses where relevant
- no hidden synthesis of missing critical fields

## 5) Dashboard Responsibilities

Dashboard responsibilities:
- Present source state and operator-facing diagnostics
- Visualize historical and forecast context
- Show confidence and residual behavior in understandable terms
- Avoid hidden assumptions about credentialed sources

Important truth:
- Not all visualizations are currently backed by production telemetry pipelines; some are demonstration datasets.

Dashboard quality contract:
- never label degraded sources as healthy
- clearly separate connected/auth-required/cached/unavailable states
- present confidence and drift as guidance, not certainty

## 6) Package Boundaries

- `domain`: shared entities, value objects, and errors
- `predictive`: signal scoring, state summarization, confidence/trust, drift, trace
- `forecasting`: forecast-window and shaping logic
- `signals`: signal processing and derivations
- `anomaly`: anomaly features
- `dispatch`, `recommendations`: planning support logic
- `simulation`: replay/scenario support

Boundary rule:
- route layer orchestrates
- package layer computes
- integration layer fetches/normalizes

## 7) Integration Boundaries

### Adapters
Adapter packages represent provider-specific APIs (Open-Meteo, NASA POWER, EIA, ENTSO-E, NREL variants).

### Connectors
Connector packages represent protocol/system edges (MQTT, OPC UA, OTEL, SiteWise, Parquet).

Design intent:
- Read and normalize
- Expose health clearly
- Keep command/control out of this layer unless explicitly designed and governed

Failure handling rule:
- integration failures should map to visible status and warning outputs, not silent fallback.

## 8) Data Strategy

`data/raw`:
- Raw captured source files (evidence and reproducibility)

`data/source_snapshots`:
- Normalized snapshots used to provide realistic local behavior

Operational rule:
- Keep source attribution attached to transformed outputs

Data governance expectations:
- UTC timestamps end-to-end
- explicit units where practical
- distinguish observed from derived/model values
- avoid writing fabricated values when true data is unavailable

## 9) Degraded Mode Handling

Expected degraded conditions:
- Missing credentials
- Provider timeout/unavailable
- Partial data windows
- Connector failure

Required response behavior:
- Return usable payload when possible
- Include warnings and source status fields
- Never pretend missing data is healthy data

Operations guidance:
- repeated degraded status on critical feeds should trigger escalation and incident review

## 10) Deployment Model

Typical deployment shape:

1. API service deployed in controlled runtime environment
2. Dashboard served as static/SPA asset
3. Connectors/adapters configured via environment and secret management
4. Monitoring stack attached to API and connector metrics

Environment tiers:
- local dev: snapshots + optional live providers
- integration: controlled provider access and connector tests
- production: governed credentials, monitoring, and incident policies

## 11) Production Hardening Checklist

Before production rollout, add or verify:
- AuthN/AuthZ
- Secret management and rotation
- Network policy and egress controls
- Structured logs and metrics
- SLOs and alerting
- Data retention and audit policy

Recommended additions:
- runbooks for provider outage and connector degradation
- schema/versioning policy for API responses
- load and failover testing for critical routes
- clear ownership matrix for route families and integration edges
