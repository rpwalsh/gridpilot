# Data Policy

This policy governs data quality, provenance, and validation integrity.

## Approved Data Profile

- Public weather/resource archives and snapshots
- Hourly resolution over 2021-2025 for demo proofing
- Site-level signals only in the public demo bundle

## Integrity Rules

- Holdout months must not be used in training calculations.
- Missing projections cannot be scored as successful hits.
- Forecast confidence bands must be shown with coverage metrics.
- Displayed inputs must map to source fields and units.

## Reproducibility Rules

- Record history window and holdout policy for every reported metric.
- Keep API limits and dashboard defaults aligned (43800h max, 5 y default).
- Preserve timestamp and source identifiers in outputs.

## Known Limits

- Public bundle does not contain full plant SCADA detail.
- Modeled generation from weather is an approximation, not meter truth.
- Confidence calibration depends on available residual history.

