# Forecast Reconciliation

Reconciliation aligns point forecasts and interval forecasts across views.

## Objectives

- maintain p10 <= p50 <= p90 at every timestamp
- avoid discontinuities at observed-to-forecast boundary
- enforce non-negative generation values

## Common Steps

1. monotonicity check for interval bounds
2. clipping and floor rules for physical validity
3. optional smoothing at horizon transition
4. consistency checks against capacity limits

## Validation Checks

- no bound inversions
- no negative power values
- stable band width progression under similar inputs

