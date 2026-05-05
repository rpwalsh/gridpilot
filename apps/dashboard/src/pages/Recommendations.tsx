import { useState } from 'react'
import DashboardCard from '../components/DashboardCard'
import RecommendationTable from '../components/RecommendationTable'
import axios from 'axios'

export default function Recommendations() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const r = await axios.post('/api/v1/recommendations/generate', {
        price_per_mwh: 75,
        assets: [
          { asset_id: 'demo_turbine_01', site_id: 'demo_site_01', asset_type: 'wind_turbine', output_kw: 300, capacity_kw: 2000, wind_speed_mps: 10 },
          { asset_id: 'demo_solar_01', site_id: 'demo_site_02', asset_type: 'solar_inverter', output_kw: 100, capacity_kw: 500, ghi_wm2: 700, temperature_c: 38 },
        ]
      })
      setResult(r.data)
    } catch { setResult({ error: 'Failed' }) }
    setLoading(false)
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, color: '#1e293b' }}>Recommendations</h1>
      <DashboardCard title="Generate Operational Recommendations">
        <button onClick={generate} disabled={loading} style={{
          padding: '0.5rem 1.25rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: '1rem'
        }}>
          {loading ? 'Generating...' : 'Generate for Demo Portfolio'}
        </button>
        {result && !result.error && <RecommendationTable recommendations={result.recommendations || []} />}
      </DashboardCard>
    </div>
  )
}
