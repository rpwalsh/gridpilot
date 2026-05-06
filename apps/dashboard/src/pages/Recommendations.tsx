import { useState } from 'react'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import axios from 'axios'

interface Recommendation {
  recommendation_id?: string
  type: string
  asset_id: string
  title?: string
  action?: string
  priority?: string
  urgency?: string
  confidence: number
  estimated_value_usd: number
  why_now?: string
}

const PRIORITY_ACCENT: Record<string, string> = {
  critical: 'var(--gp-red)',
  high: '#f97316',
  medium: 'var(--gp-amber)',
  low: 'var(--gp-slate)',
}

export default function Recommendations() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const generate = async () => {
    setLoading(true)
    try {
      const r = await axios.post('/api/v1/recommendations/generate', {
        price_per_mwh: 75,
        assets: [
          { asset_id: 'demo_turbine_01', site_id: 'demo_site_01', asset_type: 'wind_turbine',   output_kw: 300, capacity_kw: 2000, wind_speed_mps: 10 },
          { asset_id: 'demo_solar_01',   site_id: 'demo_site_02', asset_type: 'solar_inverter', output_kw: 100, capacity_kw: 500,  ghi_wm2: 700, temperature_c: 38 },
        ]
      })
      setResult(r.data)
    } catch { setResult({ error: 'Failed to generate recommendations — ensure the API is running' }) }
    setLoading(false)
  }

  const recs: Recommendation[] = result?.recommendations ?? []
  const filtered = filter === 'all' ? recs : recs.filter(r => (r.priority ?? r.urgency) === filter)

  const totalValue = recs.reduce((s, r) => s + (r.estimated_value_usd || 0), 0)
  const highPriority = recs.filter(r => r.priority === 'critical' || r.priority === 'high').length
  const avgConf = recs.length ? Math.round(recs.reduce((s, r) => s + r.confidence, 0) / recs.length * 100) : 0

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Recommendations</h1>
        <p className="gp-page-subtitle">AI-generated operational recommendations ranked by value and urgency</p>
      </div>

      {recs.length > 0 && (
        <div className="gp-stat-grid">
          <StatCard label="Total Recommendations" value={recs.length} icon="" />
          <StatCard label="High Priority" value={highPriority} icon="" accent={highPriority > 0 ? 'var(--gp-red)' : 'var(--gp-green)'} />
          <StatCard label="Total Est. Value" value={`$${totalValue.toLocaleString()}`} icon="" accent="var(--gp-teal)" />
          <StatCard label="Avg Confidence" value={`${avgConf}%`} icon="" accent="var(--gp-blue)" />
        </div>
      )}

      <DashboardCard title="Generate Recommendations">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={generate} disabled={loading} className="gp-btn gp-btn--primary">
            {loading ? <><span className="gp-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Generating…</> : ' Generate for Demo Portfolio'}
          </button>
          {recs.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--gp-text-muted)' }}>Filter:</span>
              {['all', 'critical', 'high', 'medium', 'low'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '2px 10px', border: '1px solid var(--gp-border)', borderRadius: 999,
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    background: filter === f ? 'var(--gp-blue)' : 'transparent',
                    color: filter === f ? '#fff' : 'var(--gp-text-secondary)',
                  }}
                >{f}</button>
              ))}
            </div>
          )}
        </div>
      </DashboardCard>

      {result?.error && (
        <div className="gp-callout gp-callout--danger"> {result.error}</div>
      )}

      {filtered.length > 0 && (
        <DashboardCard title={`Recommendations (${filtered.length})`}>
          <table className="gp-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Action</th>
                <th>Asset</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Confidence</th>
                <th style={{ textAlign: 'right' }}>Est. Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, i) => {
                const label = rec.action ?? rec.title ?? '—'
                const prio = rec.priority ?? rec.urgency ?? 'low'
                return (
                  <tr key={rec.recommendation_id ?? i}>
                    <td>
                      <span style={{
                        display: 'inline-block', width: 4, height: 4 + 12, borderRadius: 2,
                        background: PRIORITY_ACCENT[prio] ?? 'var(--gp-slate)',
                        marginRight: 6, verticalAlign: 'middle',
                      }} />
                      <StatusBadge label={prio} color={prio === 'critical' ? 'red' : prio === 'high' ? 'orange' : prio === 'medium' ? 'amber' : 'slate'} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--gp-text-primary)' }}>{label}</div>
                      {rec.why_now && <div style={{ fontSize: '0.75rem', color: 'var(--gp-text-muted)', marginTop: 2 }}>{rec.why_now}</div>}
                    </td>
                    <td style={{ color: 'var(--gp-text-secondary)', fontSize: '0.8rem' }}>{rec.asset_id}</td>
                    <td><StatusBadge label={rec.type.replace(/_/g, ' ')} color="blue" /></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{Math.round(rec.confidence * 100)}%</td>
                    <td style={{ textAlign: 'right', color: rec.estimated_value_usd > 0 ? 'var(--gp-green-text)' : 'var(--gp-text-muted)', fontWeight: 600 }}>
                      {rec.estimated_value_usd > 0 ? `$${rec.estimated_value_usd.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DashboardCard>
      )}

      {result && recs.length === 0 && !result.error && (
        <div className="gp-empty">
          <div className="gp-empty__icon"></div>
          <div className="gp-empty__text">No recommendations — portfolio is in good shape!</div>
        </div>
      )}
    </div>
  )
}
