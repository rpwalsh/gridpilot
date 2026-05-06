import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area,
} from 'recharts'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import axios from 'axios'

export default function GenerationForecast() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [windSpeed, setWindSpeed] = useState('8')
  const [capacity, setCapacity] = useState('2000')
  const [assetType, setAssetType] = useState('wind_turbine')
  const [ghi, setGhi] = useState('700')

  const runForecast = async () => {
    setLoading(true)
    try {
      const payload: any = {
        site_id: 'demo_site',
        asset_type: assetType,
        capacity_kw: Number(capacity),
      }
      if (assetType === 'wind_turbine') payload.wind_speed_mps = Number(windSpeed)
      if (assetType === 'solar_inverter') { payload.ghi_wm2 = Number(ghi); payload.temperature_c = 25 }
      const r = await axios.post('/api/v1/forecasts/site', payload)
      setResult(r.data)
    } catch { setResult({ error: 'Forecast failed — ensure the API is running' }) }
    setLoading(false)
  }

  const chartData = result && !result.error ? [
    { scenario: 'P10 (pessimistic)', kw: result.p10_kw, fill: '#ef4444' },
    { scenario: 'P50 (expected)',    kw: result.p50_kw, fill: '#0ea5e9' },
    { scenario: 'P90 (optimistic)',  kw: result.p90_kw, fill: '#22c55e' },
  ] : []

  const spread = result && !result.error ? result.p90_kw - result.p10_kw : null

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Forecast Context</h1>
        <p className="gp-page-subtitle">P10/P50/P90 production envelope — expected generation range given current asset type, capacity, and weather inputs</p>
      </div>

      {result && !result.error && (
        <div className="gp-stat-grid">
          <StatCard label="P10 Pessimistic" value={`${result.p10_kw?.toFixed(0)} kW`} accent="var(--gp-red)" />
          <StatCard label="P50 Expected"   value={`${result.p50_kw?.toFixed(0)} kW`} accent="var(--gp-blue)" />
          <StatCard label="P90 Optimistic"  value={`${result.p90_kw?.toFixed(0)} kW`} accent="var(--gp-green)" />
          <StatCard label="Uncertainty Band" value={`${spread?.toFixed(0)} kW`} accent="var(--gp-purple)" sub="P90 − P10 spread" />
        </div>
      )}

      <DashboardCard title="Forecast Parameters">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="gp-label">
            Asset Type
            <select
              className="gp-select"
              value={assetType}
              onChange={e => setAssetType(e.target.value)}
            >
              <option value="wind_turbine">Wind Turbine</option>
              <option value="solar_inverter">Solar Inverter</option>
            </select>
          </label>
          <label className="gp-label">
            Capacity (kW)
            <input className="gp-input" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} style={{ width: 100 }} />
          </label>
          {assetType === 'wind_turbine' && (
            <label className="gp-label">
              Wind Speed (m/s)
              <input className="gp-input" type="number" value={windSpeed} onChange={e => setWindSpeed(e.target.value)} style={{ width: 90 }} />
            </label>
          )}
          {assetType === 'solar_inverter' && (
            <label className="gp-label">
              GHI (W/m²)
              <input className="gp-input" type="number" value={ghi} onChange={e => setGhi(e.target.value)} style={{ width: 90 }} />
            </label>
          )}
          <button onClick={runForecast} disabled={loading} className="gp-btn gp-btn--primary">
            {loading ? <><span className="gp-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running…</> : ' Run Forecast'}
          </button>
        </div>
      </DashboardCard>

      {result?.error && (
        <div className="gp-callout gp-callout--danger"> {result.error}</div>
      )}

      {result && !result.error && (
        <DashboardCard title="P10 / P50 / P90 Output">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
              <XAxis dataKey="scenario" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis unit=" kW" tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(0)} kW`, 'Generation']}
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid var(--gp-border)' }}
              />
              <ReferenceLine y={result.p50_kw} stroke="var(--gp-blue)" strokeDasharray="4 2" label={{ value: 'P50', fontSize: 11, fill: '#0ea5e9' }} />
              <Bar dataKey="kw" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Bar key={i} dataKey="kw" fill={entry.fill} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>

          <div className="gp-divider" />

          <div className="gp-metric-row" style={{ justifyContent: 'center', gap: '3rem' }}>
            {chartData.map(d => (
              <div key={d.scenario} className="gp-metric">
                <div className="gp-metric__value" style={{ color: d.fill }}>{d.kw?.toFixed(0)}</div>
                <div className="gp-metric__label">{d.scenario}</div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  )
}
