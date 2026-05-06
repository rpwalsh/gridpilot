import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import axios from 'axios'

const ACTION_ACCENT: Record<string, string> = {
  charge: 'var(--gp-green)',
  discharge: 'var(--gp-red)',
  hold: 'var(--gp-slate)',
}

export default function BatteryDispatch() {
  const [soc, setSoc]     = useState('60')
  const [price, setPrice] = useState('85')
  const [solar, setSolar] = useState('500')
  const [demand, setDemand] = useState('300')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const optimize = async () => {
    setLoading(true)
    try {
      const r = await axios.post('/api/v1/dispatch/optimize', {
        battery_id: 'demo_battery_01',
        current_soc_pct: Number(soc),
        capacity_kwh: 4000,
        forecast_solar_kw: Number(solar),
        forecast_demand_kw: Number(demand),
        price_per_mwh: Number(price),
        window_hours: 4,
      })
      setResult(r.data)
    } catch { setResult({ error: 'Dispatch optimization failed — ensure the API is running' }) }
    setLoading(false)
  }

  // Simulate a 4-hour dispatch window for visualization
  const dispatchChart = result && !result.error ? Array.from({ length: 5 }, (_, h) => ({
    hour: `H+${h}`,
    solar: Math.max(0, Number(solar) * (1 - h * 0.15)),
    demand: Number(demand),
    net: Math.max(0, Number(solar) * (1 - h * 0.15)) - Number(demand),
    soc: Math.min(100, Math.max(0, Number(soc) + (result.storage_state === 'charge' ? h * 5 : result.storage_state === 'discharge' ? -h * 5 : 0))),
  })) : []

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Storage State</h1>
        <p className="gp-page-subtitle">Battery storage state analysis — net generation, demand, and SoC context for the window</p>
      </div>

      {result && !result.error && (
        <div className="gp-stat-grid">
          <StatCard
            label="Storage State"
            value={result.storage_state?.toUpperCase()}
            accent={ACTION_ACCENT[result.storage_state] ?? 'var(--gp-slate)'}
          />
          <StatCard label="Net Value" value={`$${result.net_value_usd?.toFixed(2)}`} accent="var(--gp-teal)" />
          <StatCard label="Current SoC" value={`${soc}%`} accent="var(--gp-blue)" />
          <StatCard label="Price Signal" value={`$${price}/MWh`} accent="var(--gp-purple)" />
        </div>
      )}

      <DashboardCard title="Dispatch Parameters">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="gp-label">
            Battery SoC (%)
            <input className="gp-input" type="number" value={soc} onChange={e => setSoc(e.target.value)} style={{ width: 80 }} />
          </label>
          <label className="gp-label">
            Price ($/MWh)
            <input className="gp-input" type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ width: 90 }} />
          </label>
          <label className="gp-label">
            Solar Forecast (kW)
            <input className="gp-input" type="number" value={solar} onChange={e => setSolar(e.target.value)} style={{ width: 90 }} />
          </label>
          <label className="gp-label">
            Demand (kW)
            <input className="gp-input" type="number" value={demand} onChange={e => setDemand(e.target.value)} style={{ width: 90 }} />
          </label>
          <button onClick={optimize} disabled={loading} className="gp-btn gp-btn--purple">
            {loading ? <><span className="gp-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Analyzing…</> : 'Analyze Dispatch Window'}
          </button>
        </div>
      </DashboardCard>

      {result?.error && (
        <div className="gp-callout gp-callout--danger"> {result.error}</div>
      )}

      {result && !result.error && (
        <>
          <DashboardCard title="Storage State Result">
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{
                padding: '0.75rem 2rem', borderRadius: 10,
                background: ACTION_ACCENT[result.storage_state] ?? 'var(--gp-slate)',
                color: '#fff', fontWeight: 800, fontSize: '1.4rem', letterSpacing: 1,
              }}>
                {result.storage_state?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 200, color: 'var(--gp-text-secondary)', fontSize: '0.875rem' }}>
                <div><strong>Target SoC:</strong> {result.target_soc_pct?.toFixed(1)}%</div>
                <div><strong>Estimated value:</strong> ${result.estimated_value_usd?.toFixed(2)}</div>
                <div><strong>Window:</strong> {result.window_hours}h</div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="4-Hour Dispatch Window">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={dispatchChart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="left" unit=" kW" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid var(--gp-border)' }} />
                <Bar yAxisId="left" dataKey="solar" fill="#fbbf24" opacity={0.7} radius={[3, 3, 0, 0]} name="Solar (kW)" />
                <Line yAxisId="left" type="monotone" dataKey="demand" stroke="var(--gp-red)" strokeWidth={2} dot={false} name="Demand (kW)" />
                <Line yAxisId="right" type="monotone" dataKey="soc" stroke="var(--gp-blue)" strokeWidth={2} strokeDasharray="4 2" name="SoC (%)" />
                <ReferenceLine yAxisId="left" y={0} stroke="var(--gp-border)" />
              </ComposedChart>
            </ResponsiveContainer>
          </DashboardCard>
        </>
      )}
    </div>
  )
}
