<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Causal Attribution (Practical Use)

In DispatchLayer, causal attribution means likely contributing factors behind observed changes in forecast/residual behavior.

## Intended Use

- prioritize investigation
- support manager/engineer triage conversations
- explain major behavior shifts in plain language

## Not Intended Use

- claim definitive scientific causality
- replace field inspection or engineering judgment
- provide legal or compliance-grade causation proof

## Recommended Output Format

For each major factor, include:
- factor name
- direction of impact (up/down)
- relative contribution level
- data quality confidence note

## Operational Interpretation Rules

- treat attribution as guidance, not proof
- weigh attribution confidence against source quality state
- investigate high-impact factors first

## Escalation Guidance

Escalate when:
- high-impact factors are tied to degraded or missing data
- attribution shifts rapidly across adjacent windows
- attribution conflicts with observed telemetry context
