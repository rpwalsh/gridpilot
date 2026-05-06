/**
 * Source snapshot schema for Back-Test / Proof views.
 *
 * Snapshots are captured from real provider APIs using scripts/capture_weather_snapshot.py.
 * They are never generated synthetically.
 */

export interface ProofSourceRecord {
  provider: string
  source_type: string
  latitude?: number
  longitude?: number
  station_label?: string
  elevation_m?: number | null
  timezone?: string
  captured_at_utc: string
  source_url: string
  license_or_terms: string
  query: {
    start: string
    end: string
    daily?: string[]
    aggregation?: string
    [key: string]: unknown
  }
}

export interface ProofWindows {
  training: { start_utc: string; end_utc: string }
  holdout:  { start_utc: string; end_utc: string }
}

export interface ProofIntegrity {
  record_count:   number
  missing_count:  number
  content_sha256: string
}

export interface ProofSeriesRecord {
  timestamp_utc:                  string
  year:                           number
  month:                          number
  quality:                        'GOOD' | 'MISSING' | 'DEGRADED'
  shortwave_radiation_sum_mjm2?:  number
  wind_speed_10m_max_ms?:         number
  temperature_2m_mean_c?:         number
  observed?:                      number  // generic normalized value
  unit?:                          string
}

export interface ProofDataset {
  dataset_id:     string
  schema_version: string
  source_record:  ProofSourceRecord
  windows:        ProofWindows
  integrity:      ProofIntegrity
  series:         ProofSeriesRecord[]
}

export type DatasetState =
  | 'NOT_LOADED'
  | 'LOADING'
  | 'LOADED'
  | 'LOAD_ERROR'

export interface ProofBandRecord {
  year:    number
  month:   number
  label:   string
  p10:     number
  p50:     number
  p90:     number
  actual:  number | null
  residual: number | null
  in_band: boolean | null
}

export interface ProofMetrics {
  mae:            number
  rmse:           number
  mape:           number
  bias:           number
  coverage_rate:  number
  max_abs_error:  number
  inside_band:    number
  outside_band:   number
  training_count: number
  holdout_count:  number
}

export interface SpectralBin {
  period_months: number
  label:         string
  amplitude:     number
  series:        'training' | 'holdout'
}
