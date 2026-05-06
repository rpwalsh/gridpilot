<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Product Boundary

This document defines what DispatchLayer is, what it is not, and how to communicate capability honestly.

## Mission Boundary

DispatchLayer is an operations analytics and decision-support layer for renewable portfolios.
It is not a plant control system.

## In Scope

- Read-oriented source and telemetry visibility
- Forecast context and confidence signaling
- Residual/drift interpretation for operations
- Manager-facing dashboard and API workflows
- Traceable warning and status communication

## Out of Scope

- Autonomous control of plant equipment
- Live command dispatch to field systems
- Market bid execution automation
- Replacing DCS/SCADA command stacks

## Capability Honesty Rules

Documentation and UI must clearly distinguish:
- implemented now
- partially implemented
- planned/not yet implemented

Never represent planned behavior as current runtime capability.

## Demo vs Production Boundary

Allowed in professional preview:
- snapshot-backed and generated-series workflows for UI/API realism

Required for production claims:
- validated live integrations
- operational SLOs
- hardening controls
- incident runbooks

## Messaging Rules

When presenting to stakeholders:
- lead with current implemented behavior
- state known limits explicitly
- identify dependency requirements (credentials, provider availability, connector state)

## Change Governance

When adding major capability:
1. update this boundary document
2. update README/API/architecture references
3. verify no conflicting UI or docs statements
