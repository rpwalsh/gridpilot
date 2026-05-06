/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface SiteSummary {
  site_id: string
  name: string
  asset_type: 'solar' | 'wind'
  region: string | null
  source: string
  time_resolution: string
  hourly_points: number
  timestamp_utc: string
  temperature_c: number | null
  wind_speed_mps: number | null
  wind_direction_deg: number | null
  ghi_wm2: number | null
}

export interface SourceSummaryResponse {
  dataset: string
  generated_utc: string
  coverage: { start_date: string; end_date: string; years: number; time_resolution: string }
  totals: { site_count: number; solar_site_count: number; wind_site_count: number; total_hourly_points: number }
  latest_timestamp_utc: string
  sites: SiteSummary[]
  power_data_status: { site_level_weather_available: boolean; site_level_power_available: boolean; detail: string }
}

export interface ProviderHealth {
  status: string
  latency_ms: number | null
  degraded_mode?: string
  note?: string
}

export interface ProvidersHealthResponse {
  checked_utc: string
  providers: Record<string, ProviderHealth>
}

export interface ProviderConfig {
  name: string
  enabled: boolean
  requires_key: boolean
  key_configured: boolean
}

export interface ProvidersListResponse {
  providers: ProviderConfig[]
}

export interface TimeseriesRow {
  ts: string
  temperature_2m: number | null
  wind_speed_10m: number | null
  wind_speed_80m: number | null
  wind_speed_120m: number | null
  wind_direction_10m: number | null
  wind_gusts_10m: number | null
  shortwave_radiation: number | null
  direct_normal_irradiance: number | null
  diffuse_radiation: number | null
  cloud_cover: number | null
  cloud_cover_low: number | null
  cloud_cover_mid: number | null
  cloud_cover_high: number | null
  relative_humidity_2m: number | null
  precipitation: number | null
  pressure_msl: number | null
}

export interface TimeseriesResponse {
  site_id: string
  name: string
  asset_type: 'solar' | 'wind'
  region: string | null
  latitude: number
  longitude: number
  source: string
  hours_returned: number
  archive_total_hours: number
  hourly_units: Record<string, string>
  rows: TimeseriesRow[]
}

export interface SiteForecastRequest {
  site_id: string
  asset_type: 'wind_turbine' | 'solar_inverter'
  capacity_kw: number
  wind_speed_mps?: number
  ghi_wm2?: number
  temperature_c?: number
  historical_errors?: number[]
}

export interface SiteForecastResponse {
  site_id: string
  asset_type: string
  p10_kw: number
  p50_kw: number
  p90_kw: number
  uncertainty_score: number
  decision_trace: Record<string, unknown>
}

export interface PortfolioForecastResponse {
  portfolio_id: string
  window_hours: number
  sites: SiteForecastResponse[]
  total_p50_kw: number
  total_p10_kw: number
  total_p90_kw: number
}

export interface DispatchResponse {
  battery_id: string
  action: string
  window_hours: number
  reasoning: string
  estimated_value_usd: number
  net_value_usd: number
  current_soc_pct: number
  target_soc_pct: number
  decision_trace: Record<string, unknown>
}

export interface ApiHealthResponse {
  status: string
  service: string
  version: string
  sites_indexed?: number
  hourly_archive_points?: number
  power_data_status?: { site_level_power_available: boolean }
  [key: string]: unknown
}

// ─── API Functions ───────────────────────────────────────────────────────────

export const api = {
  /** Real 10-site catalog with latest weather from Open-Meteo archive */
  sourceSummary: () => get<SourceSummaryResponse>('/api/v1/overview/source-summary'),

  /** Live probe results for open-meteo, nasa-power, noaa-nws */
  providersHealth: () => get<ProvidersHealthResponse>('/api/v1/providers/health'),

  /** Provider config (which are enabled, which need keys) */
  providersList: () => get<ProvidersListResponse>('/api/v1/providers'),

  /** Last N hourly rows from Open-Meteo archive for one site */
  timeseries: (siteId: string, hours = 168) =>
    get<TimeseriesResponse>(`/api/v1/timeseries/${siteId}?hours=${hours}`),

  /** Compute wind or solar forecast from real weather inputs */
  forecastSite: (req: SiteForecastRequest) =>
    post<SiteForecastResponse>('/api/v1/forecasts/site', req),

  /** Portfolio-level forecast */
  forecastPortfolio: (portfolioId: string, windowHours: number, sites: SiteForecastRequest[]) =>
    post<PortfolioForecastResponse>('/api/v1/forecasts/portfolio', {
      portfolio_id: portfolioId,
      window_hours: windowHours,
      sites,
    }),

  /** Battery dispatch optimization */
  dispatchOptimize: (params: {
    battery_id: string
    current_soc_pct: number
    capacity_kwh: number
    forecast_solar_kw?: number
    forecast_demand_kw?: number
    price_per_mwh?: number
    window_hours?: number
  }) => post<DispatchResponse>('/api/v1/dispatch/optimize', params),

  /** API health */
  health: () => get<ApiHealthResponse>('/api/v1/health'),

  /** Asset health for a given asset_id */
  assetHealth: (assetId: string) =>
    get<Record<string, unknown>>(`/api/v1/assets/${assetId}/health`),
}
