/**
 * ProviderStatus page
 *
 * Calls /api/v1/providers/health (real latency probes for key-free providers).
 * Shows each provider's status, latency, degraded-mode warnings, and
 * configuration instructions for key-gated providers.
 *
 * Data policy:
 *   Open-Meteo, NASA POWER, NOAA/NWS — probed live (no API key required)
 *   EIA, NREL, ENTSO-E — show "unconfigured" until keys are set
 *
 * This page is the truth window: it shows what is real vs. what is fixture.
 */
import { useState, useEffect } from 'react'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge, { resolveColor } from '../components/StatusBadge'
import axios from 'axios'

const PROVIDER_DOCS: Record<string, { label: string; url: string; description: string; keyVar?: string }> = {
  open_meteo: {
    label: 'Open-Meteo',
    url: 'https://open-meteo.com/en/docs',
    description: 'Free weather API — temperature, wind, solar irradiance. No key required.',
  },
  nasa_power: {
    label: 'NASA POWER',
    url: 'https://power.larc.nasa.gov/api/temporal/hourly/point',
    description: 'NASA Prediction of Worldwide Energy Resource. Free, no key required.',
  },
  noaa_nws: {
    label: 'NOAA/NWS',
    url: 'https://www.weather.gov/documentation/services-web-api',
    description: 'NOAA National Weather Service — hourly forecast grid. No key required.',
  },
  eia: {
    label: 'EIA',
    url: 'https://www.eia.gov/opendata/',
    description: 'U.S. Energy Information Administration — EIA-930 grid demand, generation mix.',
    keyVar: 'GRIDFORGE_EIA_API_KEY',
  },
  nrel: {
    label: 'NREL',
    url: 'https://developer.nrel.gov/',
    description: 'NREL PVWatts, Wind Toolkit, ATB. Free with registration.',
    keyVar: 'GRIDFORGE_NREL_API_KEY',
  },
  entsoe: {
    label: 'ENTSO-E',
    url: 'https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html',
    description: 'European transmission system — day-ahead prices, generation, cross-border flows.',
    keyVar: 'GRIDFORGE_ENTSOE_API_KEY',
  },
}


export default function ProviderStatus() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  const fetchHealth = async () => {
    setLoading(true)
    try {
      const r = await axios.get('/api/v1/providers/health')
      setHealth(r.data)
      setLastChecked(new Date().toLocaleTimeString())
    } catch {
      setHealth({ error: 'API unreachable' })
    }
    setLoading(false)
  }

  useEffect(() => { fetchHealth() }, [])

  const providers = health?.providers ?? {}
  const total     = Object.keys(providers).length
  const live      = Object.values(providers).filter((p: any) => p.status === 'success').length
  const warnings  = health?.warnings ?? []

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Provider Status</h1>
        <p className="gp-page-subtitle">
          Live provider health probes — real latency checks for key-free APIs.
          Key-gated providers report "unconfigured" until environment variables are configured.
        </p>
      </div>

      {/* Data policy callout */}
      <div className="gp-callout gp-callout--info" style={{ fontSize: '0.85rem' }}>
        <strong>Data policy:</strong> Dispatch Layer does not depend on fabricated runtime data.
        The production path uses provider adapters for real public weather, solar-resource, and
        grid data. Offline fixtures are used only for tests, CI, reproducible local analysis, and
        failure-mode simulation. Each result includes source attribution, provider status,
        freshness, cache status, and any degraded-mode warnings.
      </div>

      {health && !health.error && (
        <div className="gp-stat-grid">
          <StatCard label="Total Providers" value={total} />
          <StatCard label="Live / Reachable" value={live} accent={live > 0 ? 'var(--gp-green)' : 'var(--gp-red)'} />
          <StatCard label="Unconfigured" value={Object.values(providers).filter((p: any) => p.status === 'unconfigured').length} accent="var(--gp-amber)" />
          <StatCard label="Warnings" value={warnings.length} accent={warnings.length > 0 ? 'var(--gp-amber)' : 'var(--gp-green)'} />
        </div>
      )}

      <DashboardCard
        title="Provider Health"
        action={
          <button onClick={fetchHealth} disabled={loading} className="gp-btn gp-btn--sm">
            {loading ? '⟳ Probing…' : '⟳ Refresh'}
          </button>
        }
      >
        {lastChecked && (
          <div style={{ fontSize: '0.77rem', color: 'var(--gp-text-muted)', marginBottom: '0.75rem' }}>
            Last checked at {lastChecked} local
          </div>
        )}

        {health?.error ? (
          <div className="gp-callout gp-callout--danger">{health.error}</div>
        ) : (
          <table className="gp-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Latency</th>
                <th>Description</th>
                <th>Key Required</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(providers).map(([name, info]: [string, any]) => {
                const doc = PROVIDER_DOCS[name]
                return (
                  <tr key={name}>
                    <td>
                      <div style={{ fontWeight: 700 }}>
                        {doc ? (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer"
                             style={{ color: 'var(--gp-blue)', textDecoration: 'none' }}>
                            {doc.label}
                          </a>
                        ) : name}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--gp-text-muted)' }}>{name}</div>
                    </td>
                    <td>
                      <StatusBadge
                        label={info.status?.replace(/_/g, ' ')}
                        color={resolveColor(info.status ?? '')}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>
                      {info.latency_ms != null ? `${info.latency_ms} ms` : '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gp-text-secondary)', maxWidth: 280 }}>
                      {doc?.description}
                      {info.degraded_mode && (
                        <div style={{ color: 'var(--gp-amber-text)', marginTop: 2 }}>
                          {info.degraded_mode}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {doc?.keyVar ? (
                        <code style={{ background: 'var(--gp-slate-bg)', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' }}>
                          {doc.keyVar}
                        </code>
                      ) : (
                        <span style={{ color: 'var(--gp-green-text)', fontWeight: 600 }}>None</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </DashboardCard>

      {warnings.length > 0 && (
        <DashboardCard title="Configuration Warnings">
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--gp-amber-text)', fontSize: '0.875rem' }}>
            {warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
          </ul>
        </DashboardCard>
      )}

      {/* Fixture vs Live architecture explainer */}
      <DashboardCard title="Architecture: Live Providers vs Recorded Fixtures">
        <div className="gp-grid gp-grid--2">
          <div>
            <div className="gp-card__title" style={{ marginBottom: '0.5rem' }}>Live provider mode</div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--gp-text-secondary)', lineHeight: 2 }}>
              <li>Open-Meteo — hourly weather + irradiance (free, no key)</li>
              <li>NASA POWER — solar resource climatology (free, no key)</li>
              <li>EIA — ERCOT/CAISO/MISO demand + generation mix (key required)</li>
              <li>NOAA/NWS — gridded forecast (free, no key)</li>
              <li>NREL — PVWatts, Wind Toolkit (key required)</li>
            </ul>
          </div>
          <div>
            <div className="gp-card__title" style={{ marginBottom: '0.5rem' }}>Fixture mode</div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--gp-text-secondary)', lineHeight: 2 }}>
              <li>Recorded provider responses (mathematically verified)</li>
              <li>Deterministic CI tests</li>
              <li>Offline fixture mode</li>
              <li>Fault-injection simulation</li>
              <li>Provider schema regression tests</li>
            </ul>
          </div>
        </div>
        <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--gp-text-muted)', borderTop: '1px solid var(--gp-border)', paddingTop: '0.75rem' }}>
          The runtime can operate offline with fixtures, but the architecture is built around
          real public provider adapters. The adapter boundary, normalization, source attribution,
          and auditable analysis path are the same in both modes.
        </div>
      </DashboardCard>
    </div>
  )
}
