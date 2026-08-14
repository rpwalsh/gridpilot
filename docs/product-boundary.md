# Product Boundary

This document clarifies what DispatchLayer does and does not claim.

## In Scope

- Archive-backed generation modeling and validation
- Forecast interval outputs (P10, P50, P90)
- Holdout scoring against monthly actual aggregates
- Spectral diagnostics and regime indicators
- Recommendation and trace artifacts from pipeline output

## Out of Scope

- Claiming perfect or exact future predictions
- Sub-minute control or real-time SCADA replacement
- Weather nowcasting at storm-cell granularity
- Guaranteed financial outcomes from dispatch recommendations

## Forecast Page Product Contract

Forecast page must expose all of the following:

- Training/holdout split details
- Holdout hit and coverage metrics
- Full input-state variable visibility
- Concrete forecast output table
- Identified spectral signal table

If any of these are missing, the page is considered incomplete for review.

