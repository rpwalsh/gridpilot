import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardCard from '../components/DashboardCard'
import axios from 'axios'

export default function GenerationForecast() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [windSpeed, setWindSpeed] = useState('8')
  const [capacity, setCapacity] = useState('2000')

  const runForecast = async () => {
    setLoading(true)
    try {
      const r = await axios.post('/api/v1/forecasts/site', {
        site_id: 'demo_site',
        asset_type: 'wind_turbine',
        capacity_kw: Number(capacity),
        wind_speed_mps: Number(windSpeed),
      })
      setResult(r.data)
    } catch { setResult({ error: 'Forecast failed' }) }
    setLoading(false)
  }

  const chartData = result && !result.error ? [
    { name: 'P10', value: result.p10_kw },
    { name: 'P50', value: result.p50_kw },
    { name: 'P90', value: result.p90_kw },
  ] : []

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, color: '#1e293b' }}>Generation Forecast</h1>
      <DashboardCard title="Wind Site Forecast">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <label>
            Wind Speed (m/s)
            <input type="number" value={windSpeed} onChange={e => setWindSpeed(e.target.value)}
              style={{ display: 'block', marginTop: 4, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 4 }} />
          </label>
          <label>
            Capacity (kW)
            <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)}
              style={{ display: 'block', marginTop: 4, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 4 }} />
          </label>
          <button onClick={runForecast} disabled={loading} style={{
            padding: '0.5rem 1.25rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'
          }}>
            {loading ? 'Running...' : 'Run Forecast'}
          </button>
        </div>
        {result && !result.error && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: number) => `${v.toFixed(0)} kW`} />
              <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {result?.error && <div style={{ color: '#ef4444' }}>{result.error}</div>}
      </DashboardCard>
    </div>
  )
}
