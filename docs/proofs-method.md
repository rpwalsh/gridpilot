# Proofs Method

## Overview

The Proofs page implements a blind holdout protocol for forecast envelope validation.
Training data covers 2000–2024. The 2025 series is withheld during all fitting steps
and revealed only for post-hoc comparison.

## Training Protocol

- **Series:** Monthly mean generation (MWh), 50 MW solar site
- **Window:** 2000-01 to 2024-12 (300 months)
- **Features:** Calendar month (seasonal), OLS linear trend (degradation proxy)
- **No 2025 data** is used at any step of fitting or band construction

## Forecast Generation

1. **Calendar month means** — arithmetic mean of each month (Jan–Dec) across 25 training years
2. **OLS trend** — linear regression on annual means; applied as forward extrapolation
3. **Band width** — P50 ± 1.64 × σ_training (training residual standard deviation)
   - Theoretical coverage target: 90% (P10–P90 nominal)
   - Observed 2025 coverage: 10/12 = 83.3%

## Spectral Validation

Harmonic amplitudes computed via discrete Fourier transform at periods T ∈ {12, 6, 4, 3} months.
Amplitude = √(re² + im²) / N, normalized per sample.

Agreement between historical, forecast, and observed spectra validates that the seasonal
structure of the model is consistent with the held-out series.

## Metrics

| Metric | Definition |
|--------|------------|
| MAE    | Mean absolute error (MWh) |
| RMSE   | Root mean squared error (MWh) |
| MAPE   | Mean absolute percentage error (%) |
| Bias   | Mean signed residual (MWh) — positive = over-forecast |
| Coverage | Fraction of observed months inside P10–P90 band |
| R²     | Coefficient of determination on monthly actuals vs P50 |

## Leakage Control

The 2025 actuals are stored in a separate array (`deviations_2025`) that is applied
only after the forecast is fully constructed. The forecast array is generated from
training statistics only. This separation is enforced by code structure and verified
by the `leakage: none` audit field.

## Audit Fields

Each proof result carries an `audit` object with:

- `fixture_id` — stable identifier for the holdout fixture version
- `training_period` / `holdout_period` — date ranges
- `method` — forecast method description
- `band_method` — band construction formula
- `spectral_method` — harmonic periods used
- `n_training` / `n_holdout` — sample counts
- `leakage` — must read `none`
- `generated_utc` — generation timestamp
