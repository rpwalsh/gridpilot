import { useState } from 'react'
import DashboardCard from '../components/DashboardCard'
import axios from 'axios'

const TRUST_COLORS: Record<string, string> = {
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#ef4444',
  very_low: '#7f1d1d',
}

const DRIFT_COLORS: Record<string, string> = {
  none: '#22c55e',
  low: '#84cc16',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7f1d1d',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#7f1d1d',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#94a3b8',
}

const DEFAULT_SITE = {
  name: 'st_paul_solar_demo',
  latitude: 44.9537,
  longitude: -93.09,
  asset_type: 'solar',
  capacity_mw: 50,
  window_hours: 24,
  ghi_wm2: 650,
  temperature_c: 22,
  grid_demand_mw: 28000,
  forecast_residual_pct: -8.5,
  current_soc_pct: 72,
  price_per_mwh: 55,
}

export default function SiteEvaluation() {
  const [form, setForm] = useState(DEFAULT_SITE)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await axios.post('/api/v1/sites/evaluate', form)
      setResult(r.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Evaluation failed — ensure the API is running')
    }
    setLoading(false)
  }

  const inp = (label: string, key: string, type = 'number') => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.85rem', color: '#475569' }}>
      {label}
      <input
        type={type}
        value={(form as any)[key]}
        onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        style={{ padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.9rem', width: 120 }}
      />
    </label>
  )

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, color: '#1e293b' }}>Site Evaluation</h1>
      <p style={{ margin: 0, color: '#64748b' }}>
        Full L→G→P→D pipeline evaluation. Accepts site context signals and returns a forecast,
        three-term trust score, structural drift warning, and ranked operational recommendations
        with a complete audit trace.
      </p>

      <DashboardCard title="Site Configuration">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          {inp('Site name', 'name', 'text')}
          {inp('Latitude', 'latitude')}
          {inp('Longitude', 'longitude')}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.85rem', color: '#475569' }}>
            Asset type
            <select value={form.asset_type} onChange={e => set('asset_type', e.target.value)}
              style={{ padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.9rem' }}>
              <option value="solar">Solar</option>
              <option value="wind">Wind</option>
              <option value="wind_solar">Wind + Solar</option>
              <option value="bess">BESS</option>
            </select>
          </label>
          {inp('Capacity (MW)', 'capacity_mw')}
          {inp('Window (hours)', 'window_hours')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          {inp('GHI (W/m²)', 'ghi_wm2')}
          {inp('Temperature (°C)', 'temperature_c')}
          {inp('Grid demand (MW)', 'grid_demand_mw')}
          {inp('Forecast residual (%)', 'forecast_residual_pct')}
          {inp('Battery SoC (%)', 'current_soc_pct')}
          {inp('Price ($/MWh)', 'price_per_mwh')}
        </div>
        <button onClick={run} disabled={loading} style={{
          padding: '0.6rem 1.5rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600
        }}>
          {loading ? 'Evaluating...' : 'Run Evaluation'}
        </button>
        {error && <div style={{ marginTop: '0.75rem', color: '#ef4444' }}>{error}</div>}
      </DashboardCard>

      {result && (
        <>
          {/* Generation Forecast */}
          <DashboardCard title="Generation Forecast">
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[
                { label: 'P10 (pessimistic)', value: `${result.p10_mwh} MWh`, color: '#ef4444' },
                { label: 'P50 (expected)', value: `${result.p50_mwh} MWh`, color: '#0ea5e9' },
                { label: 'P90 (optimistic)', value: `${result.p90_mwh} MWh`, color: '#22c55e' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', minWidth: 120 }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* Forecast Trust */}
          <DashboardCard title="Forecast Trust Score">
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '2.5rem', fontWeight: 800,
                  color: TRUST_COLORS[result.forecast_trust_grade] || '#94a3b8'
                }}>
                  {Math.round(result.forecast_trust_score * 100)}%
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {result.forecast_trust_grade.replace('_', ' ')}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                {['structural_error', 'predictive_error', 'observational_noise'].map(k => {
                  const term = result.error_decomposition[k]
                  const pct = Math.round(term.score * 100)
                  return (
                    <div key={k} style={{ marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                        <span style={{ color: '#475569', fontWeight: 600 }}>{k.replace('_', ' ')} (ε)</span>
                        <span style={{ color: '#1e293b' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3 }}>
                        <div style={{ height: 6, borderRadius: 3, width: `${Math.min(pct, 100)}%`, background: pct > 20 ? '#f59e0b' : '#22c55e' }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{term.meaning}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            {result.trust_warnings.length > 0 && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', background: '#fef3c7', borderRadius: 4, fontSize: '0.85rem', color: '#92400e' }}>
                {result.trust_warnings.map((w: string, i: number) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}
          </DashboardCard>

          {/* Structural Drift */}
          <DashboardCard title="Structural Drift">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{
                padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 700, fontSize: '0.9rem',
                background: DRIFT_COLORS[result.structural_drift.risk] || '#94a3b8',
                color: '#fff', alignSelf: 'flex-start', textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {result.structural_drift.risk}
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: 4 }}>{result.structural_drift.reason}</div>
                {result.structural_drift.recommended_action && (
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>→ {result.structural_drift.recommended_action}</div>
                )}
              </div>
            </div>
          </DashboardCard>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <DashboardCard title="Operational Recommendations">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Priority', 'Action', 'Type', 'Confidence', 'Value', 'Urgency'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.recommendations.map((rec: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700,
                          background: PRIORITY_COLORS[rec.priority] || '#94a3b8', color: '#fff'
                        }}>{rec.priority}</span>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#1e293b', maxWidth: 300 }}>
                        <div>{rec.action}</div>
                        {rec.why_now && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{rec.why_now}</div>}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{rec.type.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{Math.round(rec.confidence * 100)}%</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: rec.estimated_value_usd > 0 ? '#166534' : '#64748b' }}>
                        {rec.estimated_value_usd > 0 ? `$${rec.estimated_value_usd.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {rec.urgency_hours != null ? `${rec.urgency_hours}h` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DashboardCard>
          )}

          {/* Audit Trace */}
          <DashboardCard title="Audit Trace">
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Trace ID: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 3 }}>{result.audit_trace.trace_id}</code>
              &nbsp;· Pipeline: <strong>{result.audit_trace.model_versions?.pipeline}</strong>
              &nbsp;· Core: v{result.audit_trace.model_versions?.predictive_core}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {result.audit_trace.steps.map((step: any, i: number) => (
                <div key={i} style={{ padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: 4, borderLeft: '3px solid #0ea5e9' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{step.step}</div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 2 }}>{step.reasoning}</div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </>
      )}
    </div>
  )
}
