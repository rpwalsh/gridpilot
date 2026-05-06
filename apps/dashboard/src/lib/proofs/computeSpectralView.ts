/**
 * Compute DFT-based spectral view from a real data series.
 * No hardcoded harmonic values. All amplitudes derived from loaded records.
 */

import type { SpectralBin } from './types'

function dftAmplitude(values: number[], periodMonths: number): number {
  const N = values.length
  if (N < periodMonths) return 0
  let re = 0
  let im = 0
  for (let n = 0; n < N; n++) {
    const angle = (2 * Math.PI * n) / periodMonths
    re += values[n] * Math.cos(angle)
    im -= values[n] * Math.sin(angle)
  }
  return Math.sqrt(re * re + im * im) / N
}

const PERIODS: Array<{ period_months: number; label: string }> = [
  { period_months: 12, label: 'Annual (12m)'      },
  { period_months: 6,  label: 'Semi-annual (6m)'  },
  { period_months: 4,  label: 'Quarterly (4m)'    },
  { period_months: 3,  label: 'Tri-monthly (3m)'  },
]

export function computeSpectralView(
  trainingValues: number[],
  holdoutValues: number[],
): SpectralBin[] {
  const bins: SpectralBin[] = []

  for (const { period_months, label } of PERIODS) {
    if (trainingValues.length >= period_months) {
      bins.push({
        period_months,
        label,
        amplitude: Math.round(dftAmplitude(trainingValues, period_months) * 1000) / 1000,
        series: 'training',
      })
    }
    if (holdoutValues.length >= period_months) {
      bins.push({
        period_months,
        label,
        amplitude: Math.round(dftAmplitude(holdoutValues, period_months) * 1000) / 1000,
        series: 'holdout',
      })
    }
  }

  return bins
}
