import { useState } from 'react'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import axios from 'axios'

const TRUST_COLORS: Record<string, string> = {
  high: 'var(--gp-green)', medium: 'var(--gp-amber)', low: 'var(--gp-amber)', very_low: 'var(--gp-red)',
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
    <label className="gp-label" key={key}>
      {label}
      <input
        type={type}
        value={(form as any)[key]}
        onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="gp-input"
        style={{ width: type === 'text' ? 160 : 110 }}
      />
    </label>
  )

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Site Evaluation</h1>
        <p className="gp-page-subtitle">
          Full L-G-P-D pipeline: local signals, structural summary, predictive evolution, trust scoring,
          drift detection, ranked recommendations, audit trace.
        </p>
      </div>

      <DashboardCard title="Site Configuration">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          {inp('Site name', 'name', 'text')}
          {inp('Latitude', 'latitude')}
          {inp('Longitude', 'longitude')}
          <label className="gp-label">
            Asset type
            <select className="gp-select" value={form.asset_type} onChange={e => set('asset_type', e.target.value)}>
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
          {inp('GHI (W/m2)', 'ghi_wm2')}
          {inp('Temperature (C)', 'temperature_c')}
          {inp('Grid demand (MW)', 'grid_demand_mw')}
          {inp('Forecast residual (%)', 'forecast_residual_pct')}
          {inp('Battery SoC (%)', 'current_soc_pct')}
          {inp('Price ($/MWh)', 'price_per_mwh')}
        </div>
        <button onClick={run} disabled={loading} className="gp-btn gp-btn--primary">
          {loading ? <><span className="gp-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Evaluating</> : 'Run Evaluation'}
        </button>
        {error && <div className="gp-callout gp-callout--danger" style={{ marginTop: '0.75rem' }}>{error}</div>}
      </DashboardCard>

      {result && (
        <>
          <div className="gp-stat-grid">
            <StatCard label="P10 Pessimistic" value={`${result.p10_mwh} MWh`} accent="var(--gp-red)" />
            <StatCard label="P50 Expected"   value={`${result.p50_mwh} MWh`} accent="var(--gp-blue)" />
            <StatCard label="P90 Optimistic"  value={`${result.p90_mwh} MWh`} accent="var(--gp-green)" />
            <StatCard
              label="Forecast Trust"
              value={`${Math.round(result.forecast_trust_score * 100)}%`}
              sub={result.forecast_trust_grade?.replace('_', ' ')}
              accent={TRUST_COLORS[result.forecast_trust_grade] ?? 'var(--gp-slate)'}
            />
          </div>

          <DashboardCard title="Forecast Trust Score">
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', minWidth: 90 }}>
                <div style={{
                  fontSize: '2.5rem', fontWeight: 800,
                  color: TRUST_COLORS[result.forecast_trust_grade] ?? 'var(--gp-slate)',
                }}>
                  {Math.round(result.forecast_trust_score * 100)}%
                </div>
                <StatusBadge label={result.forecast_trust_grade} />
              </div>
              <div style={{ flex: 1, minWidth: 260 }}>
                {['structural_error', 'predictive_error', 'observational_noise'].map(k => {
                  const term = result.error_decomposition?.[k]
                  if (!term) return null
                  const pct = Math.round(term.score * 100)
                  return (
                    <div key={k} style={{ marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
                        <span style={{ color: 'var(--gp-text-secondary)', fontWeight: 600 }}>{k.replace(/_/g, ' ')}</span>
                        <span style={{ fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div className="gp-progress">
                        <div className="gp-progress__bar" style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: pct > 20 ? 'var(--gp-amber)' : 'var(--gp-green)',
                        }} />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gp-text-muted)', marginTop: 2 }}>{term.meaning}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            {result.trust_warnings?.length > 0 && (
              <div className="gp-callout gp-callout--warning" style={{ marginTop: '0.75rem' }}>
                {result.trust_warnings.map((w: string, i: number) => <div key={i}>{w}</div>)}
              </div>
            )}
          </DashboardCard>

          <DashboardCard title="Structural Drift">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <StatusBadge
                label={result.structural_drift?.risk ?? 'unknown'}
                color={
                  result.structural_drift?.risk === 'none' ? 'green' :
                  result.structural_drift?.risk === 'low' ? 'green' :
                  result.structural_drift?.risk === 'medium' ? 'amber' :
                  result.structural_drift?.risk === 'high' ? 'orange' : 'red'
                }
              />
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--gp-text-primary)', marginBottom: 4 }}>{result.structural_drift?.reason}</div>
                {result.structural_drift?.recommended_action && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--gp-text-secondary)' }}>
                    Recommended: {result.structural_drift.recommended_action}
                  </div>
                )}
              </div>
            </div>
          </DashboardCard>

          {result.recommendations?.length > 0 && (
            <DashboardCard title="Operational Recommendations">
              <table className="gp-table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Action</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Confidence</th>
                    <th style={{ textAlign: 'right' }}>Est. Value</th>
                    <th style={{ textAlign: 'right' }}>Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {result.recommendations.map((rec: any, i: number) => (
                    <tr key={i}>
                      <td><StatusBadge label={rec.priority} /></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{rec.action}</div>
                        {rec.why_now && <div style={{ fontSize: '0.75rem', color: 'var(--gp-text-muted)', marginTop: 2 }}>{rec.why_now}</div>}
                      </td>
                      <td style={{ color: 'var(--gp-text-secondary)', fontSize: '0.8rem' }}>{rec.type?.replace(/_/g, ' ')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{Math.round(rec.confidence * 100)}%</td>
                      <td style={{ textAlign: 'right', color: rec.estimated_value_usd > 0 ? 'var(--gp-green-text)' : 'var(--gp-text-muted)', fontWeight: 600 }}>
                        {rec.estimated_value_usd > 0 ? `$${rec.estimated_value_usd.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--gp-text-muted)', fontSize: '0.8rem' }}>
                        {rec.urgency_hours != null ? `${rec.urgency_hours}h` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DashboardCard>
          )}

          <DashboardCard title="Audit Trace">
            <div style={{ fontSize: '0.8rem', color: 'var(--gp-text-secondary)', marginBottom: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span>Trace ID: <code style={{ background: 'var(--gp-slate-bg)', padding: '1px 5px', borderRadius: 3 }}>{result.audit_trace?.trace_id}</code></span>
              <span>Pipeline: <strong>{result.audit_trace?.model_versions?.pipeline}</strong></span>
              <span>Core: v{result.audit_trace?.model_versions?.predictive_core}</span>
            </div>
            <div>
              {result.audit_trace?.steps?.map((step: any, i: number) => (
                <div key={i} className="gp-step">
                  <div className="gp-step__name">{step.step}</div>
                  <div className="gp-step__reason">{step.reasoning}</div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </>
      )}
    </div>
  )
}

