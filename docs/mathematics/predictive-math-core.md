# Predictive Math Core

This note summarizes the core computations exposed to the dashboard.

## 1) Weather-to-Power Modeling

A modeled hourly generation series is derived from archive weather/resource fields.

## 2) Holdout Evaluation

Monthly totals are split into training and holdout sets.

- Holdout year target: 2025
- Hit condition: relative error <= 6%

## 3) Interval Forecasting

Projection values are emitted as p10, p50, p90 per timestamp.

## 4) Spectral Analysis

A DFT/FFT-style decomposition ranks dominant periodic components by amplitude.
Variance share is computed from squared amplitudes.

## 5) Regime Diagnostics

Rolling correlation-derived eigenvalue proxies provide structural drift signals.

