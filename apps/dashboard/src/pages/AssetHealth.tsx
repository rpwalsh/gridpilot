import { useState } from 'react'
import DashboardCard from '../components/DashboardCard'
import axios from 'axios'

export default function AssetHealth() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDetection = async () => {
    setLoading(true)
    try {
      const r = await axios.post('/api/v1/anomalies/detect', {
        asset_id: 'demo_turbine_01',
        site_id: 'demo_site_01',
        asset_type: 'wind_turbine',
        output_kw: 400,
        capacity_kw: 2000,
        wind_speed_mps: 10,
        temperature_c: 5,
      })
      setResult(r.data)
    } catch { setResult({ error: 'Detection failed' }) }
    setLoading(false)
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, color: '#1e293b' }}>Asset Health</h1>
      <DashboardCard title="Anomaly Detection Demo">
        <p style={{ color: '#64748b', marginTop: 0 }}>
          Runs anomaly detection on a demo turbine producing 400 kW at 10 m/s wind (expected ~1160 kW).
        </p>
        <button onClick={runDetection} disabled={loading} style={{
          padding: '0.5rem 1.25rem', background: '#f97316', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'
        }}>
          {loading ? 'Detecting...' : 'Run Detection'}
        </button>
        {result && (
          <pre style={{
            marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: 4,
            fontSize: '0.8rem', overflow: 'auto', maxHeight: 400
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </DashboardCard>
    </div>
  )
}
