/**
 * Overview dashboard reference data.
 *
 * Source health, provider status, asset state, deviation log, and telemetry
 * integrity values here are labeled fixture data representing what a connected
 * 137-asset renewable portfolio would surface.
 *
 * NOT included here: forecast series, proof metrics, validation numbers.
 * Those are live-API-only or require a real source snapshot.
 * See apps/dashboard/src/pages/GenerationForecast.tsx and Proofs.tsx.
 */

// ── System-level metrics ─────────────────────────────────────────────────────
export interface SystemMetrics {
  output_mw: number
  capacity_pct: number
  telemetry_integrity_pct: number
  forecast_confidence_pct: number
  output_delta_pct: number
  capacity_delta_pp: number
  integrity_delta_pp: number
  confidence_delta_pp: number
}

export const SYSTEM_METRICS: SystemMetrics = {
  output_mw:               6842.3,
  capacity_pct:            78.6,
  telemetry_integrity_pct: 99.23,
  forecast_confidence_pct: 87.6,
  output_delta_pct:        4.2,
  capacity_delta_pp:       1.8,
  integrity_delta_pp:      0.34,
  confidence_delta_pp:     2.1,
}

// ── Telemetry integrity breakdown ────────────────────────────────────────────
export interface TelemetryIntegrity {
  freshness_pct:   number
  missing_pct:     number
  bad_quality_pct: number
  conflict_pct:    number
}

export const TELEMETRY_INTEGRITY: TelemetryIntegrity = {
  freshness_pct:   98.91,
  missing_pct:      0.77,
  bad_quality_pct:  0.32,
  conflict_pct:     0.15,
}

// ── Source health rows ────────────────────────────────────────────────────────
export interface SourceRow {
  source:     string
  type:       string
  freshness:  string
  integrity:  string | null
  status:     'GOOD' | 'DEGRADED' | 'BAD'
}

export const SOURCE_HEALTH: SourceRow[] = [
  { source: 'SCADA_LAKE',       type: 'SCADA', freshness: '45s',    integrity: '99.71%', status: 'GOOD'     },
  { source: 'PLANT_PLC_VPN',    type: 'PLC',   freshness: '38s',    integrity: '99.52%', status: 'GOOD'     },
  { source: 'EMS_BRIDGE',       type: 'EMS',   freshness: '52s',    integrity: '99.12%', status: 'GOOD'     },
  { source: 'MET_STATION_NET',  type: 'MET',   freshness: '47s',    integrity: '98.83%', status: 'GOOD'     },
  { source: 'MARKET_FEED',      type: 'MKT',   freshness: '1m 12s', integrity: '98.11%', status: 'DEGRADED' },
  { source: 'THIRD_PARTY_API',  type: 'API',   freshness: '2m 08s', integrity: null,     status: 'DEGRADED' },
  { source: 'LEGACY_RTUs',      type: 'RTU',   freshness: '—',      integrity: '0.00%',  status: 'BAD'      },
]

// ── Provider status rows ─────────────────────────────────────────────────────
export interface ProviderRow {
  provider:  string
  type:      string
  status:    'GOOD' | 'DEGRADED' | 'BAD'
  latency:   string
  quality:   string
}

export const PROVIDER_STATUS: ProviderRow[] = [
  { provider: 'NWP_GLOBAL',       type: 'Weather',  status: 'GOOD',     latency: '2m 10s', quality: '98.7%' },
  { provider: 'NWP_REGIONAL',     type: 'Weather',  status: 'GOOD',     latency: '1m 12s', quality: '98.9%' },
  { provider: 'SOLAR_IRRADIANCE', type: 'Solar',    status: 'GOOD',     latency: '1m 05s', quality: '99.1%' },
  { provider: 'WIND_MODEL',       type: 'Wind',     status: 'GOOD',     latency: '1m 48s', quality: '97.8%' },
  { provider: 'LOAD_FORECAST',    type: 'Load',     status: 'GOOD',     latency: '2m 03s', quality: '98.5%' },
  { provider: 'MARKET_DATA',      type: 'Market',   status: 'GOOD',     latency: '28s',    quality: '99.6%' },
  { provider: 'GRID_TOPOLOGY',    type: 'Topology', status: 'DEGRADED', latency: '5m 22s', quality: '99.2%' },
]

// ── Asset state ───────────────────────────────────────────────────────────────
export interface AssetStateRow {
  asset_type:  string
  label:       string
  status_dot:  'green' | 'amber' | 'red' | 'none'
  output_mw:   string | null
  capacity:    string | null
}

export const ASSET_COUNTS = { online: 128, derated: 6, offline: 3, total: 137 }

export const ASSET_STATE_ROWS: AssetStateRow[] = [
  { asset_type: 'SOLAR_PLANT',  label: 'SOLAR',       status_dot: 'green', output_mw: '3,421.7', capacity: '80.1%' },
  { asset_type: 'WIND_FARM',    label: 'WIND',        status_dot: 'green', output_mw: '2,118.9', capacity: '76.3%' },
  { asset_type: 'BESS',         label: 'BESS',        status_dot: 'green', output_mw: '856.3',   capacity: '82.4%' },
  { asset_type: 'SUBSTATION',   label: 'SUB',         status_dot: 'amber', output_mw: null,      capacity: null    },
  { asset_type: 'INTERCONNECT', label: 'ICNCT',       status_dot: 'amber', output_mw: '2,910.5', capacity: null    },
  { asset_type: 'MET_STATION',  label: 'MET',         status_dot: 'green', output_mw: null,      capacity: null    },
]

// ── Deviation log rows ────────────────────────────────────────────────────────
export interface DeviationRow {
  time_utc:  string
  asset:     string
  metric:    string
  deviation: string
  severity:  'HIGH' | 'MED' | 'LOW' | 'CRITICAL'
}

export const DEVIATION_LOG: DeviationRow[] = [
  { time_utc: '14:36:12', asset: 'SOLAR_PLANT_12',   metric: 'Power',      deviation: '-256.4 MW', severity: 'HIGH'  },
  { time_utc: '14:35:47', asset: 'WIND_FARM_03_T07', metric: 'Power',      deviation: '+178.9 MW', severity: 'HIGH'  },
  { time_utc: '14:34:55', asset: 'BESS_UNIT_07',     metric: 'SOC',        deviation: '-15.2 %',   severity: 'MED'   },
  { time_utc: '14:33:21', asset: 'SUB_34KV_02',      metric: 'Voltage',    deviation: '+6.3 kV',   severity: 'MED'   },
  { time_utc: '14:33:01', asset: 'INTERCONNECT_HOU', metric: 'Flow',       deviation: '+312.7 MW', severity: 'MED'   },
  { time_utc: '14:32:19', asset: 'SOLAR_PLANT_05',   metric: 'Irradiance', deviation: '-22.1 %',   severity: 'LOW'   },
]

// ── Audit metadata ────────────────────────────────────────────────────────────
export const AUDIT_METADATA: Record<string, string> = {
  'Run ID':             'd1sp-20250521-143000-6f2a',
  'Model Version':      'v5.3.1',
  'Model Family':       'HybridEnsemble',
  'Training Data':      '2000-01-01 to 2024-12-31',
  'Holdout Data':       '2025-01-01 to 2025-05-21',
  'Execution Time':     '2025-05-21 14:30:00 UTC',
  'Data Latency (p95)': '1m 48s',
  'Feature Set Hash':   'a7f3c2b9',
  'Config Hash':        '9e7d1f4a',
  'Deployed By':        'ops_ctrl',
  'Environment':        'PROD',
  'Audit Signature':    '7b2d4f9c3e8a1d0',
}
