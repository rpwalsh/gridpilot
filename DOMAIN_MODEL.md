<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Domain Model

This model description is written for operations-oriented engineering teams.

## Why This Model Exists

DispatchLayer must combine multiple data sources without losing operational meaning.
The domain model standardizes that meaning so routes, dashboards, and package logic remain consistent.

Model priorities:

- traceability
- consistent identifiers
- explicit data quality context
- separation of observed vs derived values

## Core Business Objects

### Site
A physical plant or logical generation location.

Typical fields:
- site id
- location
- asset mix
- capacity

### Asset
A unit inside a site (for example inverter, turbine, battery).

Typical fields:
- asset id
- asset type
- rated capacity
- status context

Common asset types seen in repository workflows:
- solar
- wind
- wind_solar
- bess
- solar_bess

### Telemetry Point
A single time-stamped metric observation.

Important properties:
- timestamp
- metric identifier
- value
- source/provenance

### Telemetry Snapshot
Latest normalized view of asset condition.

Used for:
- dashboard health cards
- latest state route responses
- quick site triage workflows

### Forecast Window
Time range and resolution for forecast context generation.

### Provider Source / Connector
Metadata about where data came from and whether it is healthy.

Expected status semantics include:
- connected/success
- auth required
- cached/local fallback
- unavailable/error

## Predictive/Decision Objects

### Signal Score
Scored quality and relevance of an observed signal.

### Structural State
Compact representation of site condition used for context generation.

### Trust/Confidence Output
How much confidence to place in forecast context for current conditions.

### Drift Indicator
Flag that recent residual behavior changed enough to warrant caution.

### Decision Trace
Step-by-step audit record of how output was produced.

## Entity Relationships (Conceptual)

- A site contains one or more assets.
- Assets emit telemetry points.
- Telemetry points are normalized into snapshots.
- Forecast windows and site context feed predictive evaluation.
- Predictive evaluation emits forecast context, trust, drift, and decision trace.
- Provider and connector metadata annotate all upstream dependencies.

## Data Lifecycle (High Level)

1. Raw data arrives from provider/connector/snapshot source
2. Data is normalized into domain-aligned structures
3. Route logic composes domain + predictive outputs
4. API response returns values + status + warnings + attribution
5. Dashboard renders operational interpretation

## Validation Rules

### Identity

- Site and asset identifiers should remain stable across route families.
- IDs should not be repurposed across unrelated entities.

### Time

- UTC required for internal representation.
- Route payloads should not mix local time assumptions.

### Quality and Provenance

- Preserve provider/connector source identity.
- Keep quality flags when mapping raw to normalized forms.
- Never suppress warnings that materially affect interpretation.

### Derived Values

- Derived/model values must be distinguishable from observed values.
- Confidence and drift are guidance metrics, not guaranteed outcomes.

## Modeling Rules (Operational)

- UTC timestamps end-to-end
- Do not lose source attribution during transformations
- Missing values stay missing (do not convert to deceptive defaults)
- Keep observed fields separate from derived/model fields

## Change Management Rules

When extending the model:

1. Document new entities and fields in this file
2. Update route request/response schemas
3. Validate dashboard compatibility for affected pages
4. Add tests for degraded and partial-data scenarios
