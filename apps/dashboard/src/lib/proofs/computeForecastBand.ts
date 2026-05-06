/**
 * Compute p10/p50/p90 forecast bands for the holdout window using training data only.
 *
 * Method: seasonal calendar-month quantiles from the training window.
 * The holdout is never used in forecast generation.
 */

import type { ProofDataset, ProofBandRecord, ProofSeriesRecord } from './types'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Extract the primary numeric value from a series record. */
function primaryValue(rec: ProofSeriesRecord): number | null {
  if (rec.observed != null) return rec.observed
  if (rec.shortwave_radiation_sum_mjm2 != null) return rec.shortwave_radiation_sum_mjm2
  if (rec.wind_speed_10m_max_ms != null) return rec.wind_speed_10m_max_ms
  if (rec.temperature_2m_mean_c != null) return rec.temperature_2m_mean_c
  return null
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const idx = q * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

export interface BandResult {
  training: ProofSeriesRecord[]
  holdout:  ProofSeriesRecord[]
  bands:    ProofBandRecord[]
  primary_field: string
}

export function computeForecastBand(dataset: ProofDataset): BandResult {
  const trainingEnd = new Date(dataset.windows.training.end_utc)
  const holdoutStart = new Date(dataset.windows.holdout.start_utc)

  const training = dataset.series.filter(r => new Date(r.timestamp_utc) <= trainingEnd)
  const holdout  = dataset.series.filter(r => new Date(r.timestamp_utc) >= holdoutStart)

  // Determine primary field label
  const sample = training[0]
  let primary_field = 'observed'
  if (sample?.shortwave_radiation_sum_mjm2 != null) primary_field = 'shortwave_radiation_sum_mjm2'
  else if (sample?.wind_speed_10m_max_ms != null) primary_field = 'wind_speed_10m_max_ms'
  else if (sample?.temperature_2m_mean_c != null) primary_field = 'temperature_2m_mean_c'

  // Group training values by calendar month
  const byMonth: Record<number, number[]> = {}
  for (let m = 1; m <= 12; m++) byMonth[m] = []

  for (const rec of training) {
    if (rec.quality === 'MISSING') continue
    const v = primaryValue(rec)
    if (v != null) byMonth[rec.month].push(v)
  }

  for (const arr of Object.values(byMonth)) arr.sort((a, b) => a - b)

  // Build band for each holdout record
  const bands: ProofBandRecord[] = holdout.map(rec => {
    const monthVals = byMonth[rec.month] ?? []
    const p10 = quantile(monthVals, 0.10)
    const p50 = quantile(monthVals, 0.50)
    const p90 = quantile(monthVals, 0.90)

    const actual = rec.quality === 'MISSING' ? null : primaryValue(rec)
    const residual = actual != null ? actual - p50 : null
    const in_band = actual != null ? actual >= p10 && actual <= p90 : null

    return {
      year:    rec.year,
      month:   rec.month,
      label:   `${rec.year}-${MONTH_NAMES[rec.month - 1]}`,
      p10:     Math.round(p10 * 1000) / 1000,
      p50:     Math.round(p50 * 1000) / 1000,
      p90:     Math.round(p90 * 1000) / 1000,
      actual,
      residual: residual != null ? Math.round(residual * 1000) / 1000 : null,
      in_band,
    }
  })

  return { training, holdout, bands, primary_field }
}
