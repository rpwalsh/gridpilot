import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardCard from '../components/DashboardCard'
import axios from 'axios'

interface ProviderStatus { name: string; enabled: boolean; requires_key: boolean; key_configured: boolean }

export default function PortfolioOverview() {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axios.get('/api/v1/providers').then(r => setProviders(r.data.providers)).catch(() => setError('API unavailable'))
  }, [])

  const chartData = providers.map(p => ({
    name: p.name, status: p.enabled ? 1 : 0
  }))

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, color: '#1e293b' }}>Portfolio Overview</h1>
      {error && <div style={{ color: '#ef4444' }}>{error} — ensure the API is running</div>}
      <DashboardCard title="Data Provider Status">
        {providers.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {providers.map(p => (
              <div key={p.name} style={{
                padding: '0.5rem 1rem', borderRadius: 6,
                background: p.enabled ? '#dcfce7' : '#fee2e2',
                color: p.enabled ? '#166534' : '#991b1b',
                fontSize: '0.875rem'
              }}>
                <strong>{p.name}</strong>
                {p.requires_key && !p.key_configured && ' ⚠ key missing'}
              </div>
            ))}
          </div>
        ) : <p style={{ color: '#94a3b8' }}>Loading...</p>}
      </DashboardCard>
      <DashboardCard title="Provider Availability">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 1]} ticks={[0, 1]} />
            <Tooltip />
            <Bar dataKey="status" fill="#38bdf8" />
          </BarChart>
        </ResponsiveContainer>
      </DashboardCard>
    </div>
  )
}
