import { useState } from 'react'
import DashboardCard from '../components/DashboardCard'
import axios from 'axios'

export default function BatteryDispatch() {
  const [soc, setSoc] = useState('60')
  const [price, setPrice] = useState('85')
  const [solar, setSolar] = useState('500')
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
        forecast_demand_kw: 300,
        price_per_mwh: Number(price),
        window_hours: 4,
      })
      setResult(r.data)
    } catch { setResult({ error: 'Dispatch optimization failed' }) }
    setLoading(false)
  }

  const ACTION_COLORS: Record<string, string> = { charge: '#22c55e', discharge: '#ef4444', hold: '#94a3b8' }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, color: '#1e293b' }}>Battery Dispatch</h1>
      <DashboardCard title="Dispatch Optimizer">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <label>SoC (%) <input type="number" value={soc} onChange={e => setSoc(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, width: 80 }} /></label>
          <label>Price ($/MWh) <input type="number" value={price} onChange={e => setPrice(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, width: 90 }} /></label>
          <label>Solar (kW) <input type="number" value={solar} onChange={e => setSolar(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, width: 90 }} /></label>
          <button onClick={optimize} disabled={loading} style={{
            alignSelf: 'flex-end', padding: '0.5rem 1.25rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'
          }}>
            {loading ? 'Optimizing...' : 'Optimize'}
          </button>
        </div>
        {result && !result.error && (
          <div>
            <div style={{
              display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: 6,
              background: ACTION_COLORS[result.action] || '#94a3b8', color: '#fff', fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.75rem'
            }}>
              {result.action?.toUpperCase()}
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569' }}>
              {result.reasoning?.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
              Net value: <strong>${result.net_value_usd?.toFixed(2)}</strong>
            </p>
          </div>
        )}
      </DashboardCard>
    </div>
  )
}
