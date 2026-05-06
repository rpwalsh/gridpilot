import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend,
} from 'recharts'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import axios from 'axios'

interface ProviderStatus { name: string; enabled: boolean; requires_key: boolean; key_configured: boolean }

export default function PortfolioOverview() {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axios.get('/api/v1/providers').then(r => setProviders(r.data.providers)).catch(() => setError('API unavailable'))
  }, [])

  const enabled = providers.filter(p => p.enabled).length
  const total = providers.length
  const missingKey = providers.filter(p => p.requires_key && !p.key_configured).length

  const chartData = providers.map(p => ({
    name: p.name.replace('_', ' '),
    status: p.enabled ? 1 : 0,
    fill: p.enabled ? 'var(--gp-green)' : 'var(--gp-slate)',
  }))

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Portfolio Overview</h1>
        <p className="gp-page-subtitle">Real-time data provider status and fleet-level signal health</p>
      </div>

      {error && (
        <div className="gp-callout gp-callout--warning">
           {error} — ensure the API is running
        </div>
      )}

      <div className="gp-stat-grid">
        <StatCard label="Total Providers" value={total || '—'} icon="" />
        <StatCard label="Enabled" value={enabled || '—'} icon="" accent="var(--gp-green)" />
        <StatCard label="Missing Keys" value={missingKey} icon="" accent={missingKey > 0 ? 'var(--gp-amber)' : 'var(--gp-green)'} />
        <StatCard label="Coverage" value={total > 0 ? `${Math.round(enabled / total * 100)}%` : '—'} icon="" accent="var(--gp-teal)" />
      </div>

      <DashboardCard title="Data Provider Status">
        {providers.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {providers.map(p => (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.45rem 0.85rem', borderRadius: 8,
                background: p.enabled ? 'var(--gp-green-bg)' : 'var(--gp-slate-bg)',
                border: `1px solid ${p.enabled ? '#bbf7d0' : '#e2e8f0'}`,
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: p.enabled ? 'var(--gp-green-text)' : '#64748b' }}>
                  {p.name.replace(/_/g, ' ')}
                </span>
                {p.requires_key && !p.key_configured && (
                  <StatusBadge label="key missing" color="amber" />
                )}
                {!p.enabled && <StatusBadge label="disabled" color="slate" />}
                {p.enabled && <StatusBadge label="live" color="green" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="gp-empty">
            <div className="gp-empty__icon"></div>
            <div className="gp-empty__text">{error ? 'API unavailable' : 'Loading providers…'}</div>
          </div>
        )}
      </DashboardCard>

      <DashboardCard title="Provider Availability">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={v => v === 1 ? 'On' : 'Off'} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                formatter={(v: number) => v === 1 ? 'Enabled' : 'Disabled'}
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid var(--gp-border)' }}
              />
              <Bar dataKey="status" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gp-text-muted)' }}>
            No data
          </div>
        )}
      </DashboardCard>
    </div>
  )
}
