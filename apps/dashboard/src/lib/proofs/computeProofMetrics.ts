/**
 * Compute validation metrics from forecast bands vs holdout actuals.
 * All metrics are derived from loaded source data — no hardcoded values.
 */

import type { ProofBandRecord, ProofMetrics } from './types'

export function computeProofMetrics(
  bands: ProofBandRecord[],
  trainingCount: number,
): ProofMetrics {
  const evaluated = bands.filter(b => b.actual != null && b.residual != null)

  if (!evaluated.length) {
    return {
      mae: 0, rmse: 0, mape: 0, bias: 0,
      coverage_rate: 0, max_abs_error: 0,
      inside_band: 0, outside_band: 0,
      training_count: trainingCount,
      holdout_count: bands.length,
    }
  }

  const residuals = evaluated.map(b => b.residual!)
  const actuals   = evaluated.map(b => b.actual!)

  const mae = residuals.reduce((s, r) => s + Math.abs(r), 0) / residuals.length
  const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length)
  const mape = (residuals.reduce((s, r, i) => {
    const a = actuals[i]
    return a !== 0 ? s + Math.abs(r / a) : s
  }, 0) / residuals.length) * 100
  const bias = residuals.reduce((a, b) => a + b, 0) / residuals.length
  const max_abs_error = Math.max(...residuals.map(Math.abs))

  const inside_band  = evaluated.filter(b => b.in_band === true).length
  const outside_band = evaluated.filter(b => b.in_band === false).length
  const coverage_rate = evaluated.length ? inside_band / evaluated.length : 0

  return {
    mae:            Math.round(mae * 1000) / 1000,
    rmse:           Math.round(rmse * 1000) / 1000,
    mape:           Math.round(mape * 10) / 10,
    bias:           Math.round(bias * 1000) / 1000,
    coverage_rate:  Math.round(coverage_rate * 1000) / 1000,
    max_abs_error:  Math.round(max_abs_error * 1000) / 1000,
    inside_band,
    outside_band,
    training_count: trainingCount,
    holdout_count:  bands.length,
  }
}
