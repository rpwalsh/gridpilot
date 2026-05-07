# Predictive Math Core

This note summarizes the core computations exposed to the dashboard, with the
actual equations implemented in the codebase.

## 1) Weather-to-Power Modeling

A modeled hourly generation series is derived from archive weather/resource fields.

### Solar: PVWatts-style irradiance model (`solar_irradiance_model.py`)

```
irradiance_fraction = GHI / 1000 W/m²
cell_temp_C         = ambient_temp_C + 30 × irradiance_fraction
temp_derate         = max(0.5, 1 + (−0.004) × (cell_temp_C − 25))
dc_output_kW        = capacity_kW × irradiance_fraction × temp_derate
ac_output_kW        = max(0, dc_output_kW × (1 − 0.14) / 1.2)
```

Constants: temperature coefficient −0.4%/°C, reference 25°C, system losses 14%,
DC/AC ratio 1.2.

### Wind: cubic polynomial power curve (`wind_power_curve.py`)

```
if wind_speed < 3 m/s or ≥ 25 m/s:  output = 0
if wind_speed ≥ 12 m/s:              output = rated_capacity_kW
else:
    normalized = (wind_speed − 3) / (12 − 3)
    output     = rated_capacity_kW × normalized³
```

Cut-in 3 m/s, rated 12 m/s, cut-out 25 m/s.
For wind sites, `wind_speed_80m` is used as the primary signal; falls back to
`wind_speed_10m` when unavailable.

## 2) Holdout Evaluation

Monthly totals are split into training and holdout sets.

- Holdout year target: 2025
- Training: all non-holdout months in the selected history window
- Hit condition: abs(projected − actual) / actual ≤ 6%
- Missing projections are not counted as hits (null, not true)

## 3) Interval Forecasting — P10/P50/P90 (`forecast_bounds.py`)

```
base_spread = stdev(historical_errors) / max(|point_forecast|, 1) × 1.5
              (floor 0.05, cap 0.50; default 0.15 if < 5 errors available)
total_spread = base_spread + Σ(uncertainty_factor × 0.05)
σ            = point_forecast × total_spread
p50          = point_forecast
p10          = max(0, p50 − 1.28 × σ)
p90          = p50 + 1.28 × σ
uncertainty_score = min(1.0, total_spread / 0.50)
```

1.28σ corresponds to the 10th/90th percentile of a normal distribution.

## 4) Forecast Reconciliation (`reconciliation.py`)

```
bias_correction = −mean(historical_errors)              [if ≥ 3 errors]
                + raw_forecast × (telemetry_deviation% / 100) × 0.5
adjusted        = raw_forecast + bias_correction
confidence      = min(0.5 + 0.1 × evidence_count, 0.95)
                  (capped further by residual variability when ≥ 10 errors)
```

## 5) Spectral Analysis

A DFT/FFT-style decomposition ranks dominant periodic components by amplitude.
Variance share is computed from squared amplitudes normalized to total power.
The 24-hour harmonic is the expected dominant frequency for solar production.

## 6) Regime Diagnostics — Structural Drift (`structural_drift.py`)

Detects when the residual distribution has shifted from its baseline:

```
shift_std = |mean(recent_residuals) − mean(baseline_residuals)| / std(baseline_residuals)
drift_magnitude = min(1.0, shift_std / (threshold × 2))

if shift_std < 1.0:     risk = NONE
elif shift_std < 1.5:   risk = LOW    (mild drift, monitor)
elif shift_std < 3.0:   risk = MEDIUM (regime transitioning)
else:                   risk = HIGH   (significant structural drift)
```

Default `drift_threshold_std = 1.5`. Requires ≥ 2 recent residuals and ≥ 4
baseline residuals to assess.

## 7) L-Layer: Typed Temporal Signal Scoring (`local_signal_scorer.py`)

Each interaction between operational entities is scored as:

```
score = W_{α,β} × raw_value × exp(−λ_{α,β} × Δt) × data_quality
```

where:
- `W_{α,β}` is the type-pair base weight (0.70–0.95)
- `λ_{α,β}` is the type-pair decay rate (hours⁻¹)
- `Δt` is elapsed time since the observation (hours)

Example decay rates:
- Weather → asset: λ = 0.20 (~5h half-life)
- Market price → dispatch: λ = 0.35 (~2.8h half-life)
- Maintenance event → asset: λ = 0.005 (~140h half-life)

