<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Connector Strategy

This strategy describes how connector integrations should be designed, implemented, and operated in DispatchLayer.

## Scope

Connector scope is read-oriented integration for protocol/system edges:
- OpenTelemetry
- OPC UA
- MQTT
- AWS SiteWise
- S3/Parquet archives

Connector scope does not include command/control actions unless explicitly governed and designed.

## Strategic Objectives

- Reliable ingestion visibility from external systems
- Explicit health and error-state reporting
- Predictable degraded behavior under partial failure
- Clear mapping from protocol-native data to internal domain shape

## Architecture Principles

1. Health-first contract
- Every connector must expose operational state
- State should include last-success and failure context where practical

2. Deterministic normalization
- Map protocol-native payloads to stable internal fields
- Keep unit semantics and quality flags explicit

3. Degraded-mode transparency
- Return partial availability and warnings when possible
- Never silently present degraded input as healthy

4. Operationally useful errors
- Surface error category and connector identity
- Keep error output actionable for escalation

## Rollout Plan

Phase 1: Connectivity and state
- basic connection checks
- status endpoint integration

Phase 2: Sampling and mapping
- read sample payloads
- normalize core fields

Phase 3: Reliability and throughput
- retry policy
- backoff/timing behavior
- sampling consistency checks

Phase 4: Observability and operations
- metrics, alerts, runbooks
- incident response integration

## Required Metrics

Minimum connector metrics:
- success rate
- latency
- missing/invalid sample ratio
- reconnect/retry count
- time since last good sample

## Testing Expectations

- unit tests for normalization mapping
- integration tests for connector state behavior
- degraded-path tests for timeout/auth/network failures
- schema stability checks for route consumers

## Operations Runbook Triggers

Raise connector incident when:
- connector remains in error beyond threshold window
- repeated retries with no successful sample
- state flaps frequently (unstable connection)
- normalized payload quality drops below agreed threshold

## Ownership Guidance

For each connector define:
- technical owner
- escalation path
- SLO/target thresholds
- known dependency constraints
