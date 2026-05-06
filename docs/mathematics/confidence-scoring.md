<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Confidence Scoring

Confidence scoring estimates how much reliance to place on forecast context for a specific time window.

## Why It Matters

Operations teams need a clear signal for when to trust normal planning assumptions and when to apply caution.

## Main Drivers

- data freshness
- data completeness
- cross-signal consistency
- recent residual stability
- provider and connector health

## Typical Levels

- High:
  - inputs are fresh and consistent
  - residual behavior stable
  - normal planning confidence

- Medium:
  - partial degradation present
  - additional monitoring recommended
  - moderate planning caution

- Low:
  - significant data or stability issues
  - conservative assumptions required
  - escalation likely needed

## Operational Actions by Level

High:
- continue normal planning cadence

Medium:
- tighten review frequency
- monitor critical feeds more closely

Low:
- increase safety margin
- validate source and connector state
- log escalation and owner

## Common Failure Patterns

- stale but present data appears complete without freshness checks
- confidence not reduced when key source goes degraded
- low confidence not reflected in operator workflow

## Quality Rule

Confidence outputs must track data-quality reality. If inputs degrade, confidence should degrade.
