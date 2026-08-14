# Analysis Guide

This guide describes how to analyze forecast behavior and proof quality using the current dashboard.

## Scope

Use this workflow for the Forecast page under a 5-year archive window.

Required assumptions:

- history window: 43800h
- holdout policy: force holdout year to 2025
- training window: 2021-2024
- holdout monthly hit threshold: 6%

## Step-by-Step Review

1. Open /forecast and select site plus 5 y history.
2. Confirm training and holdout labels in Validation Summary.
3. Review proof metrics:
   - holdout hits
   - P10 coverage
   - P90 coverage
4. Open Forecast Bands and inspect:
   - input state table
   - forecast output table (next 24 steps)
   - identified spectral signals table
5. Open Spectral Checks and compare top harmonics and eigenvalue drift.

## Interpretation Guidance

- High holdout hit with poor P10/P90 coverage indicates miscalibration.
- Narrow bands with repeated misses indicate under-dispersion.
- Dominant 24h harmonic is expected for solar production cycles.
- Large low-frequency components can indicate seasonal or structural shifts.

## Red Flags

- Holdout hit equals 100% with zero or near-zero residual spread.
- Training window includes holdout months.
- Projection fallback to actuals in scored holdout rows.
- Missing projection values counted as hits.

## Suggested Outputs for Reviews

- Site and period under test
- Training and holdout windows
- Holdout hit count and percentage
- P10/P90 coverage percentages
- Top 5 spectral signals and variance shares
- Notes on known data gaps and uncertainty drivers

