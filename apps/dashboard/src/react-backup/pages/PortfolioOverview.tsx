/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import axios from 'axios'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge, { resolveColor } from '../components/StatusBadge'

type OverviewSite = {
  site_id: string
  name: string
  asset_type: 'solar' | 'wind'
  region?: string
  source: string
  time_resolution: string
  hourly_points: number
  timestamp_utc: string
  temperature_c: number | null
  wind_speed_mps: number | null
  wind_direction_deg: number | null
  ghi_wm2: number | null
}

type OverviewSummary = {
  dataset: string
  generated_utc?: string
  coverage: {
    start_date?: string
    end_date?: string
    years?: number
    time_resolution?: string
  }
  totals: {
    site_count: number
    solar_site_count: number
    wind_site_count: number
    total_hourly_points: number
    pvdaq_system_count: number
  }
  latest_timestamp_utc?: string
  sites: OverviewSite[]
  power_data_status: {
    site_level_weather_available: boolean
    site_level_power_available: boolean
    component_scada_available: boolean
    detail: string
  }
}

type ProviderHealth = {
  providers: Record<string, { status?: string; latency_ms?: number; degraded_mode?: string }>
}

function fmtNumber(value: number): string {
  return value.toLocaleString()
}

function fmtMaybe(value: number | null | undefined, digits = 1): string {
  return value == null ? '0.0' : value.toFixed(digits)
}

export default function PortfolioOverview() {
  const [summary, setSummary] = useState<OverviewSummary | null>(null)
  const [providerHealth, setProviderHealth] = useState<ProviderHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryResp, providerResp] = await Promise.all([
        axios.get('/api/v1/overview/source-summary'),
        axios.get('/api/v1/providers/health'),
      ])
      setSummary(summaryResp.data)
      setProviderHealth(providerResp.data)
    } catch {
      setError('Could not load overview source summary. Ensure the API is running.')
    }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const weatherBars = useMemo(() => {
    if (!summary) return []
    return summary.sites.map((site) => ({
      name: site.site_id.replace(/^solar_|^wind_/, '').slice(0, 12),
      siteId: site.site_id,
      ghi: site.ghi_wm2 ?? 0,
      assetType: site.asset_type,
    }))
  }, [summary])

  const liveProviders = Object.values(providerHealth?.providers ?? {}).filter((p) => p.status === 'success').length

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <div>
          <h1 className="gp-page-title">Overview</h1>
        </div>
        <button onClick={refresh} disabled={loading} className="gp-btn gp-btn--sm">
          {loading ? ' Refreshing' : ' Refresh'}
        </button>
      </div>

      {error && <div className="gp-callout gp-callout--danger">Overview data unavailable</div>}

      {summary && (
        <>
          <div className="gp-stat-grid">
            <StatCard label="Sites" value={summary.totals.site_count} sub={`${summary.totals.solar_site_count} solar  ${summary.totals.wind_site_count} wind`} />
            <StatCard label="Hourly Rows" value={fmtNumber(summary.totals.total_hourly_points)} sub={`${summary.coverage.years} years  ${summary.coverage.time_resolution}`} accent="var(--gp-green)" />
            <StatCard label="Live Providers" value={liveProviders} sub={`${Object.keys(providerHealth?.providers ?? {}).length} tracked`} accent="var(--gp-blue)" />
            <StatCard label="PVDAQ Systems" value={summary.totals.pvdaq_system_count} sub="metadata tracked" accent="var(--gp-amber)" />
          </div>

          <DashboardCard title="Coverage">
            <div className="gp-grid gp-grid--2">
              <div className="gp-signal-grid">
                <div className="gp-signal-kv"><span className="gp-signal-kv__key">Dataset</span><span className="gp-signal-kv__val">{summary.dataset}</span></div>
                <div className="gp-signal-kv"><span className="gp-signal-kv__key">Generated UTC</span><span className="gp-signal-kv__val">{summary.generated_utc ?? 'n/a'}</span></div>
                <div className="gp-signal-kv"><span className="gp-signal-kv__key">Start date</span><span className="gp-signal-kv__val">{summary.coverage.start_date ?? 'n/a'}</span></div>
                <div className="gp-signal-kv"><span className="gp-signal-kv__key">End date</span><span className="gp-signal-kv__val">{summary.coverage.end_date ?? 'n/a'}</span></div>
              </div>
              <div className="gp-signal-grid">
                <div className="gp-signal-kv"><span className="gp-signal-kv__key">Latest UTC</span><span className="gp-signal-kv__val">{summary.latest_timestamp_utc ?? 'n/a'}</span></div>
                <div className="gp-signal-kv"><span className="gp-signal-kv__key">Weather rows</span><span className="gp-signal-kv__val">{summary.power_data_status.site_level_weather_available ? 'available' : 'not available'}</span></div>
                <div className="gp-signal-kv"><span className="gp-signal-kv__key">Measured power</span><span className="gp-signal-kv__val">{summary.power_data_status.site_level_power_available ? 'available' : 'not available'}</span></div>
                <div className="gp-signal-kv"><span className="gp-signal-kv__key">Component SCADA</span><span className="gp-signal-kv__val">{summary.power_data_status.component_scada_available ? 'available' : 'not available'}</span></div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Latest Site Weather">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weatherBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--gp-text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--gp-text-muted)' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--gp-border)', fontSize: 12 }} />
                <Bar dataKey="ghi" name="GHI (W/m)" radius={[4, 4, 0, 0]}>
                  {weatherBars.map((item) => (
                    <Cell key={item.siteId} fill={item.assetType === 'solar' ? '#fbbf24' : '#60a5fa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </DashboardCard>

          <DashboardCard title="Site Source Matrix">
            <table className="gp-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th style={{ textAlign: 'right' }}>Rows</th>
                  <th style={{ textAlign: 'right' }}>Temp C</th>
                  <th style={{ textAlign: 'right' }}>Wind m/s</th>
                  <th style={{ textAlign: 'right' }}>GHI W/m</th>
                </tr>
              </thead>
              <tbody>
                {summary.sites.map((site) => (
                  <tr key={site.site_id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{site.name}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--gp-text-muted)' }}>{site.site_id}</div>
                    </td>
                    <td>{site.asset_type}</td>
                    <td>{site.source}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNumber(site.hourly_points)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMaybe(site.temperature_c)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMaybe(site.wind_speed_mps)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMaybe(site.ghi_wm2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardCard>

          <DashboardCard title="Provider Reachability">
            <table className="gp-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Latency</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(providerHealth?.providers ?? {}).map(([name, info]) => (
                  <tr key={name}>
                    <td style={{ fontFamily: 'monospace' }}>{name}</td>
                    <td>
                      <StatusBadge label={(info.status ?? 'unknown').replace(/_/g, ' ')} color={resolveColor(info.status ?? '')} />
                    </td>
                    <td style={{ textAlign: 'right' }}>{info.latency_ms != null ? `${info.latency_ms} ms` : ''}</td>
                    <td>{info.degraded_mode ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardCard>
        </>
      )}
    </div>
  )
}

