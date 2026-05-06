import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import axios from 'axios'

const DEMO_ASSETS = [
  { asset_id: 'demo_turbine_01', site_id: 'demo_site_01', asset_type: 'wind_turbine',    label: 'Wind Turbine 01', output_kw: 400,  capacity_kw: 2000, wind_speed_mps: 10, temperature_c: 5  },
  { asset_id: 'demo_turbine_02', site_id: 'demo_site_01', asset_type: 'wind_turbine',    label: 'Wind Turbine 02', output_kw: 1600, capacity_kw: 2000, wind_speed_mps: 10, temperature_c: 5  },
  { asset_id: 'demo_solar_01',   site_id: 'demo_site_02', asset_type: 'solar_inverter',  label: 'Solar Array 01',  output_kw: 400,  capacity_kw: 500,  ghi_wm2: 700,       temperature_c: 38 },
]

export default function AssetHealth() {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  const runAll = async () => {
    setLoading(true)
    const out: Record<string, any> = {}
    await Promise.all(DEMO_ASSETS.map(async a => {
      try {
        const { label, ...payload } = a
        const r = await axios.post('/api/v1/anomalies/detect', payload)
        out[a.asset_id] = r.data
      } catch {
        out[a.asset_id] = { error: 'Detection failed' }
      }
    }))
    setResults(out)
    setLoading(false)
  }

  const utilization = (asset: typeof DEMO_ASSETS[0]) =>
    Math.round((asset.output_kw / asset.capacity_kw) * 100)

  const anomalyCount = Object.values(results).filter((r: any) => r?.is_anomaly).length

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Asset Health</h1>
        <p className="gp-page-subtitle">Real-time anomaly detection across the renewable fleet</p>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="gp-stat-grid">
          <StatCard label="Assets Checked" value={DEMO_ASSETS.length} icon="" />
          <StatCard label="Anomalies" value={anomalyCount} icon="" accent={anomalyCount > 0 ? 'var(--gp-red)' : 'var(--gp-green)'} />
          <StatCard label="Healthy" value={DEMO_ASSETS.length - anomalyCount} icon="" accent="var(--gp-green)" />
          <StatCard label="Detection Rate" value={`${Math.round((1 - anomalyCount / DEMO_ASSETS.length) * 100)}%`} icon="" accent="var(--gp-teal)" sub="Fraction healthy" />
        </div>
      )}

      <DashboardCard title="Fleet Anomaly Detection">
        <p style={{ color: 'var(--gp-text-secondary)', margin: '0 0 1rem', fontSize: '0.875rem' }}>
          Runs Z-score anomaly detection on {DEMO_ASSETS.length} demo assets comparing actual output vs. expected from physics model.
        </p>
        <button onClick={runAll} disabled={loading} className="gp-btn gp-btn--warning">
          {loading ? <><span className="gp-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Scanning…</> : ' Run Detection on All Assets'}
        </button>
      </DashboardCard>

      <div className="gp-grid--2 gp-grid">
        {DEMO_ASSETS.map(asset => {
          const result = results[asset.asset_id]
          const util = utilization(asset)
          return (
            <DashboardCard key={asset.asset_id} title={asset.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gp-text-muted)' }}>{asset.asset_type.replace(/_/g, ' ')} · {asset.site_id}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gp-text-primary)', marginTop: 2 }}>
                    {asset.output_kw.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--gp-text-muted)' }}>kW</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)' }}>of {asset.capacity_kw.toLocaleString()} kW capacity</div>
                </div>
                {result && !result.error && (
                  <StatusBadge label={result.is_anomaly ? 'anomaly' : 'healthy'} color={result.is_anomaly ? 'red' : 'green'} />
                )}
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--gp-text-secondary)' }}>Utilization</span>
                  <span style={{ fontWeight: 700 }}>{util}%</span>
                </div>
                <div className="gp-progress">
                  <div className="gp-progress__bar" style={{
                    width: `${util}%`,
                    background: util < 30 ? 'var(--gp-red)' : util < 60 ? 'var(--gp-amber)' : 'var(--gp-green)',
                  }} />
                </div>
              </div>

              {result && !result.error && (
                <div style={{ fontSize: '0.8rem', color: 'var(--gp-text-secondary)' }}>
                  <div>Z-score: <strong style={{ color: result.is_anomaly ? 'var(--gp-red)' : 'var(--gp-green)' }}>{result.z_score?.toFixed(2)}</strong></div>
                  {result.expected_kw != null && (
                    <div>Expected: {result.expected_kw?.toFixed(0)} kW · Δ {(asset.output_kw - result.expected_kw).toFixed(0)} kW</div>
                  )}
                </div>
              )}
            </DashboardCard>
          )
        })}

        {/* Radar health summary (available after results) */}
        {Object.keys(results).length > 0 && (
          <DashboardCard title="Fleet Health Radar">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={DEMO_ASSETS.map(a => ({
                subject: a.label.replace(/\s\d+$/, '') + ' ' + a.asset_id.slice(-2),
                utilization: utilization(a),
                health: results[a.asset_id]?.is_anomaly ? 0 : 100,
              }))}>
                <PolarGrid stroke="var(--gp-border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Radar name="Utilization" dataKey="utilization" stroke="var(--gp-blue)" fill="var(--gp-blue)" fillOpacity={0.2} />
                <Radar name="Health" dataKey="health" stroke="var(--gp-green)" fill="var(--gp-green)" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </DashboardCard>
        )}
      </div>
    </div>
  )
}
