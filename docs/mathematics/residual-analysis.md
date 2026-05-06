<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Residual Analysis

Residual is the difference between observed and expected values.

## Operational Purpose

Residual analysis detects when forecast context is diverging from field reality.

## Core Measures

- bias: average residual direction over a window
- spread: variation of residuals over time
- outlier frequency: count of large deviations
- regime shift: abrupt change in residual behavior pattern

## Why Managers Care

Residual behavior is often the earliest indicator that current planning confidence should be reduced.

## Interpretation Patterns

- persistent positive bias: system regularly underestimates observed values
- persistent negative bias: system regularly overestimates observed values
- rising spread: stability is declining
- clustered outliers: potentially changing conditions or data quality issue

## Escalation Criteria

Escalate when:
- directional bias persists across multiple windows
- spread increases materially and remains elevated
- outliers cluster in short time spans

## Expected System Behavior

When residual quality worsens, system should:
- lower confidence/trust
- raise drift warning signals
- preserve source/warning context for troubleshooting

## Analysis Hygiene

- evaluate residuals with source quality context
- keep UTC-aligned windows
- avoid single-point conclusions without trend confirmation
