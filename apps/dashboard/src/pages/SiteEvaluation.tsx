import { useState } from 'react'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import ProviderSourcePanel from '../components/ProviderSourcePanel'
import AuditTimeline from '../components/AuditTimeline'
import axios from 'axios'

const TRUST_COLORS: Record<string, string> = {
  high: 'var(--gp-green)', medium: 'var(--gp-amber)', low: 'var(--gp-amber)', very_low: 'var(--gp-red)',
}

const DEFAULT_SITE = {
  name: 'north_ridge_solar',
  latitude: 44.9537,
  longitude: -93.09,
  asset_type: 'solar',
  capacity_mw: 50,
  window_hours: 24,
  data_mode: 'hybrid',
  // optional signal overrides — leave blank to let live provider fill these
  ghi_wm2: '',
  temperature_c: '',
  wind_speed_mps: '',
  grid_demand_mw: 28000,
  forecast_residual_pct: -8.5,
  current_soc_pct: 72,
  price_per_mwh: 55,
}

const DATA_MODE_DESCS: Record<string, string> = {
  live:    'Calls real public providers (Open-Meteo, NASA POWER)',
  fixture: 'Offline SCADA fixture — reproducible local analysis',
  hybrid:  'Live where reachable; offline fixture fallback for unavailable providers',
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
      // Strip empty optional numeric fields so they become null on the backend
      const payload: Record<string, any> = { ...form }
      for (const k of ['ghi_wm2', 'temperature_c', 'wind_speed_mps']) {
        if (payload[k] === '' || payload[k] === null) delete payload[k]
        else payload[k] = Number(payload[k])
      }
      const r = await axios.post('/api/v1/sites/evaluate', payload)
      setResult(r.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Evaluation failed — ensure the API is running')
    }
    setLoading(false)
  }

  const numInp = (label: string, key: string, placeholder?: string) => (
    <label className="gp-label" key={key}>
      {label}
      <input
        type="number"
        value={(form as any)[key]}
        placeholder={placeholder ?? ''}
        onChange={e => set(key, e.target.value)}
        className="gp-input"
        style={{ width: 110 }}
      />
    </label>
  )

  const txtInp = (label: string, key: string) => (
    <label className="gp-label" key={key}>
      {label}
      <input
        type="text"
        value={(form as any)[key]}
        onChange={e => set(key, e.target.value)}
        className="gp-input"
        style={{ width: 160 }}
      />
    </label>
  )

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Snapshot Analysis</h1>
        <p className="gp-page-subtitle">
          Ingest a site snapshot and run the full analysis pipeline: signal scoring →
          structural state → forecast context → data-quality confidence → drift detection → audit trace.
          Live mode fetches real weather signals from Open-Meteo for the given coordinates.
        </p>
      </div>

      <DashboardCard title="Snapshot Parameters">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          {txtInp('Site name', 'name')}
          {numInp('Latitude', 'latitude')}
          {numInp('Longitude', 'longitude')}
          <label className="gp-label">
            Asset type
            <select className="gp-select" value={form.asset_type} onChange={e => set('asset_type', e.target.value)}>
              <option value="solar">Solar</option>
              <option value="wind">Wind</option>
              <option value="wind_solar">Wind + Solar</option>
              <option value="solar_bess">Solar + BESS</option>
              <option value="bess">BESS</option>
            </select>
          </label>
          {numInp('Capacity (MW)', 'capacity_mw')}
          {numInp('Window (hours)', 'window_hours')}
        </div>

        {/* data_mode selector */}
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--gp-slate-bg)', borderRadius: 'var(--gp-radius-sm)', border: '1px solid var(--gp-border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gp-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Data Mode
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {(['live', 'fixture', 'hybrid'] as const).map(m => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="radio"
                  name="data_mode"
                  value={m}
                  checked={form.data_mode === m}
                  onChange={() => set('data_mode', m)}
                />
                <span className={`gp-badge gp-badge--${m === 'live' ? 'green' : m === 'fixture' ? 'blue' : 'purple'}`}
                  style={{ cursor: 'pointer' }}>{m.toUpperCase()}</span>
                <span style={{ color: 'var(--gp-text-muted)', fontSize: '0.78rem' }}>{DATA_MODE_DESCS[m]}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          {numInp('GHI (W/m²)', 'ghi_wm2', form.data_mode !== 'fixture' ? 'from provider' : '')}
          {numInp('Temperature (°C)', 'temperature_c', form.data_mode !== 'fixture' ? 'from provider' : '')}
          {numInp('Wind (m/s)', 'wind_speed_mps', form.data_mode !== 'fixture' ? 'from provider' : '')}
          {numInp('Grid demand (MW)', 'grid_demand_mw')}
          {numInp('Forecast residual (%)', 'forecast_residual_pct')}
          {numInp('Battery SoC (%)', 'current_soc_pct')}
          {numInp('Price ($/MWh)', 'price_per_mwh')}
        </div>
        {form.data_mode !== 'fixture' && (
          <div style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)', marginBottom: '0.75rem' }}>
            GHI, Temperature, and Wind speed will be fetched from Open-Meteo for ({form.latitude}, {form.longitude}).
            Enter values to override provider signals.
          </div>
        )}
        <button onClick={run} disabled={loading} className="gp-btn gp-btn--primary">
          {loading ? <><span className="gp-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Analyzing…</> : 'Analyze Snapshot'}
        </button>
        {error && <div className="gp-callout gp-callout--danger" style={{ marginTop: '0.75rem' }}>{error}</div>}
      </DashboardCard>

      {result && (
        <>
          {/* Provider source attribution panel */}
          {result.sources && (
            <DashboardCard title="Provider Sources &amp; Data Attribution">
              <ProviderSourcePanel
                dataMode={result.data_mode ?? form.data_mode}
                sources={result.sources}
                warnings={result.warnings}
              />
            </DashboardCard>
          )}

          <div className="gp-stat-grid">
            <StatCard label="P10 Pessimistic" value={`${result.p10_mwh} MWh`} accent="var(--gp-red)" />
            <StatCard label="P50 Expected"   value={`${result.p50_mwh} MWh`} accent="var(--gp-blue)" />
            <StatCard label="P90 Optimistic"  value={`${result.p90_mwh} MWh`} accent="var(--gp-green)" />
            <StatCard
              label="Data-Quality Confidence"
              value={`${Math.round(result.forecast_trust_score * 100)}%`}
              sub={result.forecast_trust_grade?.replace('_', ' ')}
              accent={TRUST_COLORS[result.forecast_trust_grade] ?? 'var(--gp-slate)'}
            />
          </div>

          <DashboardCard title="Forecast Confidence & Error Decomposition">
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
              </div>
            </div>
          </DashboardCard>

          {/* Audit Trace */}
          <DashboardCard title="Audit Trace — Analysis Pipeline">
            <AuditTimeline
              steps={result.audit_trace?.steps ?? []}
              traceId={result.audit_trace?.trace_id}
              modelVersions={result.audit_trace?.model_versions}
            />
          </DashboardCard>
        </>
      )}
    </div>
  )
}
