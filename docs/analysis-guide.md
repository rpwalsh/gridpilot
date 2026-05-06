<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Analysis Guide (Power Plant Manager)

This guide defines the practical daily and weekly analysis workflow for operations teams using DispatchLayer.

## Purpose

DispatchLayer analysis is meant to support operational judgment, not replace it.
Use this guide to answer:
- Are we operating on trustworthy data right now?
- Are site conditions stable or drifting?
- Do we need to escalate to engineering or field teams?

## Shift-Start Workflow (10-15 Minutes)

1. Check source health
- Open Sources view
- Confirm connected vs auth-required vs cached vs degraded
- Log any critical feed unavailable for more than one review interval

2. Check telemetry currency
- Review latest site/asset snapshot timestamps
- Flag stale updates or missing key metrics

3. Check forecast context and confidence
- Open Bands and related forecast views
- Compare confidence level to previous shift
- Note widening bands or persistent confidence decline

4. Check residual behavior
- Look for sustained residual bias (same-side errors)
- Look for rising residual spread (loss of stability)

5. Record and assign
- Document operational posture (normal/caution/escalation)
- Assign follow-up owner and review time

## Daily Operating Decisions

### Normal
Use when:
- core sources healthy
- confidence stable
- residual behavior within expected range

Action:
- continue normal planning cadence

### Caution
Use when:
- one or more important feeds degraded
- confidence dips but not persistently low
- residual spread increasing but not extreme

Action:
- tighten operating margin
- increase review frequency
- notify engineering for watch

### Escalation
Use when:
- multiple critical sources unavailable
- confidence remains low across multiple intervals
- residuals show persistent bias/regime shift

Action:
- open incident ticket
- notify engineering lead and operations manager
- shift planning assumptions to conservative mode

## Escalation Triggers

Escalate immediately when any of the following is true:
- confidence drops sharply and remains low for consecutive windows
- two or more core inputs are degraded simultaneously
- site-level snapshots stop refreshing
- residuals show sustained directional bias plus spread expansion

## Decision Log Template

Capture each significant decision with:
- timestamp UTC
- site/portfolio scope
- source state summary
- confidence/trust summary
- residual/drift summary
- decision made
- owner
- next review checkpoint

## Weekly Review Cadence

Each week, review:
- repeated degraded sources by provider/connector
- recurring low-confidence windows by site
- incident count tied to source quality or residual drift
- unresolved warnings older than one week

Outcome should be a short action list with owners.

## Practical Rules

- If data quality is uncertain, operate conservatively.
- Never present degraded mode as healthy state.
- Keep written assumptions in the decision log.
- Use confidence as guidance, not certainty.
