<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# DispatchLayer Python Deep Dive

This document explains the Python side of DispatchLayer in practical engineering terms:

- How the Python monorepo is organized
- How request and data flow works through API and packages
- Where to add or modify logic safely
- How to run, test, and troubleshoot Python code paths

## 1. Scope of Python in This Repository

Python owns the backend and operational analytics logic:

- FastAPI service: `apps/api`
- Shared domain model package: `packages/domain`
- Analytical and decision packages:
  - `packages/forecasting`
  - `packages/predictive`
  - `packages/signals`
  - `packages/anomaly`
  - `packages/recommendations`
  - `packages/dispatch`
  - `packages/simulation`
- Integration packages:
  - Provider adapters under `packages/adapters/*`
  - Connector clients under `packages/connectors/*`
- Data capture and prep scripts under `scripts`

The frontend in `apps/dashboard` consumes API outputs but is not part of this Python deep dive.

## 2. Monorepo Python Package Model

Each Python package has its own `pyproject.toml`, source folder, and package namespace. This allows clear boundaries and explicit ownership.

Typical package structure:

- `pyproject.toml`
- `src/<package_name>/...`
- Optional `tests/`

Example package names:

- `dispatchlayer_domain`
- `dispatchlayer_forecasting`
- `dispatchlayer_predictive`
- `dispatchlayer_signals`

Key principle: domain objects are shared, behavior is layered.

- Domain package defines model shape and contracts
- Higher packages implement computation and scoring
- API routes compose package outputs for client consumption

## 3. API Layer Deep Dive

Primary API code sits in `apps/api/src/dispatchlayer_api`.

Important route modules include:

- `routes/telemetry.py`
- `routes/sites.py`
- `routes/providers.py`
- `routes/forecasts.py`
- `routes/connectors.py`
- `routes/predictive.py`
- `routes/signals.py`
- `routes/anomalies.py`
- `routes/audit.py`
- `routes/dispatch.py`

### Request lifecycle

1. Dashboard calls a FastAPI endpoint under `/api/v1`.
2. Route validates params and request bodies.
3. Route gathers source data from adapters, connectors, in-memory state, or local snapshots.
4. Route calls package-level logic to normalize, score, or aggregate.
5. Route returns JSON with values plus warning context.

### Reliability behaviors

Routes in this preview repo intentionally expose degraded-mode states rather than hiding them.

Examples:

- Missing source data returns warning fields and empty arrays instead of fabricated values
- Source mode vs live mode is explicit in route params where supported
- Health and confidence outputs are presented as advisory, not guarantees

## 4. Data and State Surfaces

Python code reads from multiple data surfaces:

- Runtime in-memory stores (for local preview flow)
- Snapshot files in `data/source_snapshots`
- Raw capture payloads in `data/raw/curl`
- Provider and connector responses (when credentials and connectivity are available)

### Local preview realism

This repository mixes real captured source snapshots with local preview logic. Some outputs represent source-backed context, while some are assembled for operational UI continuity.

You should keep these distinctions explicit when modifying code.

## 5. Domain and Model Conventions

Use domain models from `packages/domain` as the canonical contract.

Guidelines:

- Keep timestamp fields UTC and explicit
- Preserve units in field names where possible (for example `_kw`, `_pct`, `_mps`)
- Do not coerce missing values into synthetic defaults unless route contract requires it
- Keep source attribution visible in payloads

## 6. Predictive and Scoring Layers

Predictive and signal logic is distributed across these packages:

- `packages/predictive`: confidence, trust, drift, decision ranking
- `packages/signals`: signal evaluation and ranking
- `packages/anomaly`: anomaly criteria and detection
- `packages/recommendations`: recommendation synthesis

When extending scoring logic:

1. Define input/output shape first
2. Keep deterministic logic pure where possible
3. Add tests for threshold boundaries and missing-data behavior
4. Surface uncertainty explicitly to route responses

## 7. Adapter and Connector Layers

Adapters and connectors separate external integration concerns from route composition.

- Adapters (`packages/adapters/*`) are provider-specific API integrations
- Connectors (`packages/connectors/*`) are protocol/system clients (MQTT, OPC UA, OTEL, SiteWise, Parquet)

Design pattern:

- Keep IO boundaries in adapter/connector package code
- Keep route files focused on orchestration and response shaping
- Avoid embedding provider-specific request logic directly in route modules

## 8. Running Python Locally

From repo root, install and run according to `QUICKSTART.md`.

General workflow:

1. Install Python dependencies for the API and packages
2. Start API service
3. Hit `/api/v1` routes directly or via dashboard
4. Validate route behavior with source snapshots and no-credential scenarios

## 9. Testing and Validation

Current test coverage is package-specific and uneven by module maturity.

Recommended validation loop for Python changes:

1. Run unit tests for touched package(s)
2. Run API smoke checks for affected routes
3. Verify degraded mode responses remain explicit
4. Verify no silent schema drift in response payloads

If you change domain model fields, also verify:

- Route serialization compatibility
- Dashboard parsing expectations
- Existing snapshot consumers

## 10. Safe Change Strategy

Use this sequence for non-trivial backend changes:

1. Update or add domain model fields first
2. Update package logic next
3. Update route shaping and warnings
4. Add or update tests
5. Validate with local snapshots and real-source paths where available

This sequence reduces accidental behavior regressions and keeps operational semantics clear.

## 11. Common Pitfalls

- Treating preview data as production-grade telemetry
- Hiding data gaps instead of surfacing warnings
- Mixing connector-specific behavior into route files
- Creating implicit unit changes without schema updates
- Returning non-UTC timestamps

## 12. Suggested Next Reading

- `README.md` for product and operations framing
- `ARCHITECTURE.md` for system boundaries
- `API.md` for route responsibilities
- `DOMAIN_MODEL.md` for entity semantics
- `docs/analysis-guide.md` for operator workflow

If you are implementing Python features, start in this order:

1. `packages/domain`
2. target analytics package (`forecasting`, `predictive`, `signals`, etc.)
3. `apps/api` route wiring
4. package and route tests
