<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Decision Trace

Decision trace is the audit log that explains how predictive outputs were produced.

## Purpose

- support incident debugging
- support operational handoff
- support engineering validation and review

## Required Fields

- UTC timestamp
- pipeline step name
- key inputs used
- key outputs produced
- reasoning summary
- component/model version identifiers

## Recommended Fields

- source status snapshot at evaluation time
- warning list at evaluation time
- confidence before/after reconciliation (where relevant)
- request correlation id

## Quality Standards

Trace should be:
- concise
- consistent
- deterministic in structure
- sufficient for post-event reconstruction

## Operational Use Cases

- explain why confidence changed
- investigate unexpected recommendation shifts
- compare behavior between two runs/environments

## Anti-Patterns to Avoid

- traces that omit degraded source context
- traces with ambiguous step names
- traces that include outputs without input references
