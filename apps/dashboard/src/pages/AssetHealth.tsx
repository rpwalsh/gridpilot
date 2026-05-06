import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import axios from 'axios'

/**
 * SCADA-pattern asset defaults seeded from the recorded fixture.
 *
 * These values are NOT invented: they are derived from published physics models
 * (IEC 61400-1 wind turbine power curve, NREL WTK mean wind statistics) and
 * documented in apps/api/tests/fixtures/scada_fleet_snapshot.json → _provenance.
 *
 * The anomaly benchmark fields (output_kw vs capacity_kw) reflect the
 * expected-vs-actual pattern used by /api/v1/anomalies/detect.
 */
const DEMO_ASSETS = [
  {
    asset_id: 'WTG-MCW-001', site_id: 'MCW', asset_type: 'wind_turbine',
    label: 'WTG-MCW-001 (Healthy)', output_kw: 444, capacity_kw: 2000,
    wind_speed_mps: 8.5, temperature_c: 38.2,
    _note: 'Expected 456 kW at v=8.5 m/s hub-height per physics model. Actual 444 kW (97.4%).',
  },
  {
    asset_id: 'WTG-MCW-002', site_id: 'MCW', asset_type: 'wind_turbine',
    label: 'WTG-MCW-002 (Anomaly — pitch deviation)', output_kw: 272, capacity_kw: 2000,
    wind_speed_mps: 8.5, temperature_c: 38.2,
    _note: 'Expected 456 kW. Actual 272 kW (59.6%). PITCH_CTRL_DEVIATION fault active.',
  },
  {
    asset_id: 'WTG-MCW-003', site_id: 'MCW', asset_type: 'wind_turbine',
    label: 'WTG-MCW-003 (Healthy)', output_kw: 441, capacity_kw: 2000,
    wind_speed_mps: 8.5, temperature_c: 38.2,
    _note: 'Expected 456 kW. Actual 441 kW (96.7%).',
  },
  {
    asset_id: 'INV-DLS-001', site_id: 'DLS', asset_type: 'solar_inverter',
    label: 'INV-DLS-001 (Healthy)', output_kw: 280, capacity_kw: 500,
    ghi_wm2: 977, temperature_c: 41.0,
    _note: 'Expected 287 kW at GHI=977 W/m², T=41°C. Actual 280 kW (97.6%).',
  },
]

export default function AssetHealth() {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  const runAll = async () => {
    setLoading(true)
    const out: Record<string, any> = {}
    await Promise.all(DEMO_ASSETS.map(async a => {
      try {
        const { label, _note, ...payload } = a
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

  const deviationCount = Object.values(results).filter((r: any) => r?.deviation_detected).length

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Asset State</h1>
        <p className="gp-page-subtitle">
          Actual vs. expected output — physics-model residual per asset.
          Source: offline SCADA fixture (West Texas wind + Mojave solar, 2025-06-05T20:00Z).
        </p>
      </div>

      {/* Fixture provenance notice */}
      <div className="gp-callout gp-callout--info" style={{ fontSize: '0.82rem' }}>
        <strong>Fixture:</strong> WTG-MCW-002 residual = −40.4%.
        blade_pitch_deg = 12.4°, fault code PITCH_CTRL_DEVIATION.
        Expected output from IEC 61400-1 power curve.
        See <code>apps/api/tests/fixtures/scada_fleet_snapshot.json → _provenance</code>.
      </div>

      {Object.keys(results).length > 0 && (
        <div className="gp-stat-grid">
          <StatCard label="Assets" value={DEMO_ASSETS.length} />
          <StatCard label="Deviations" value={deviationCount} accent={deviationCount > 0 ? 'var(--gp-red)' : 'var(--gp-green)'} />
          <StatCard label="Within Envelope" value={DEMO_ASSETS.length - deviationCount} accent="var(--gp-green)" />
          <StatCard label="Envelope Rate" value={`${Math.round((1 - deviationCount / DEMO_ASSETS.length) * 100)}%`} accent="var(--gp-teal)" sub="Fraction within expected range" />
        </div>
      )}

      <DashboardCard title="Fleet Deviation Analysis">
        <p style={{ color: 'var(--gp-text-secondary)', margin: '0 0 1rem', fontSize: '0.875rem' }}>
          Z-score residual analysis — {DEMO_ASSETS.length} assets, actual vs. physics-model expected.
        </p>
        <button onClick={runAll} disabled={loading} className="gp-btn gp-btn--warning">
          {loading ? <><span className="gp-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Analyzing…</> : 'Analyze All Assets'}
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
                  <StatusBadge label={result.deviation_detected ? 'deviation' : 'nominal'} color={result.deviation_detected ? 'red' : 'green'} />
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
                  <div>Z-score: <strong style={{ color: result.deviation_detected ? 'var(--gp-red)' : 'var(--gp-green)' }}>{result.z_score?.toFixed(2)}</strong></div>
                  {result.expected_output_kw != null && (
                    <div>Expected: {result.expected_output_kw?.toFixed(0)} kW · Δ {(asset.output_kw - result.expected_output_kw).toFixed(0)} kW</div>
                  )}
                </div>
              )}

              {/* SCADA context note */}
              <div style={{ marginTop: '0.5rem', fontSize: '0.73rem', color: 'var(--gp-text-muted)', borderTop: '1px solid var(--gp-border)', paddingTop: '0.5rem' }}>
                {asset._note}
              </div>
            </DashboardCard>
          )
        })}

        {/* Radar health summary */}
        {Object.keys(results).length > 0 && (
          <DashboardCard title="Fleet Health Radar">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={DEMO_ASSETS.map(a => ({
                subject: a.asset_id.split('-').slice(-2).join('-'),
                utilization: utilization(a),
                health: results[a.asset_id]?.deviation_detected ? 0 : 100,
              }))}>
                <PolarGrid stroke="var(--gp-border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#7ab87a' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#4a7a4a' }} />
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
