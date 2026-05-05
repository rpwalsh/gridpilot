import { useState } from 'react'
import DashboardCard from '../components/DashboardCard'
import axios from 'axios'

export default function AuditTrail() {
  const [traceId, setTraceId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const lookup = async () => {
    if (!traceId.trim()) return
    setLoading(true)
    try {
      const r = await axios.get(`/api/v1/audit/trace/${traceId.trim()}`)
      setResult(r.data)
    } catch (e: any) { setResult({ error: e.response?.data?.detail || 'Not found' }) }
    setLoading(false)
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, color: '#1e293b' }}>Audit Trail</h1>
      <DashboardCard title="Decision Trace Lookup">
        <p style={{ color: '#64748b', marginTop: 0 }}>
          Every API response includes a <code>decision_trace</code> with a <code>trace_id</code>. Paste an ID below to look it up.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={traceId}
            onChange={e => setTraceId(e.target.value)}
            placeholder="trace_abc123..."
            style={{ flex: 1, padding: '0.4rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 4 }}
          />
          <button onClick={lookup} disabled={loading} style={{
            padding: '0.5rem 1rem', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'
          }}>
            {loading ? 'Looking up...' : 'Lookup'}
          </button>
        </div>
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
