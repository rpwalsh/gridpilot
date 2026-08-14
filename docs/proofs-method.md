# Proofs Method

This method defines how forecast quality claims are established in the dashboard.

## Proof Configuration

- History window: 5 years (43800h)
- Holdout policy: year 2025 when present
- Training window: all non-holdout months
- Hit rule: monthly relative error <= 6%

## Computation Overview

1. Build modeled hourly generation from archive signals.
2. Aggregate to monthly totals.
3. Split training vs holdout by month key and forced holdout year.
4. Fit profile from training months.
5. Score holdout months with no training leakage.
6. Compute P10/P90 containment over hourly modeled series.

## Required Evidence in UI

- Holdout hit numerator/denominator
- P10 and P90 coverage values
- Forecast output table (P10/P50/P90 values by timestamp)
- Spectral signal table (period and variance share)

## Invalid Proof Patterns

- Using holdout values as projection fallback
- Counting null projections as hits
- Reporting score without split context

## Reporting Format

For each claim, provide:

- Site
- Time window
- Training/holdout range
- Holdout hit percentage
- Coverage percentages
- Primary spectral components

