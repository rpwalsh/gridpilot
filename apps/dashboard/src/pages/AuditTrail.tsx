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

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') lookup() }

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Audit Trail</h1>
        <p className="gp-page-subtitle">Replay any decision trace by ID — every evaluation is fully auditable</p>
      </div>

      <DashboardCard title="Audit Trace Lookup">
        <p style={{ color: 'var(--gp-text-secondary)', marginTop: 0, fontSize: '0.875rem' }}>
          Every API response includes an <code style={{ background: 'var(--gp-slate-bg)', padding: '1px 5px', borderRadius: 3 }}>audit_trace</code> with
          a <code style={{ background: 'var(--gp-slate-bg)', padding: '1px 5px', borderRadius: 3 }}>trace_id</code>.
          Paste an ID below to look up the pipeline record.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={traceId}
            onChange={e => setTraceId(e.target.value)}
            onKeyDown={handleKey}
            placeholder="trace_abc123..."
            className="gp-input"
            style={{ flex: 1 }}
          />
          <button onClick={lookup} disabled={loading || !traceId.trim()} className="gp-btn gp-btn--dark">
            {loading ? <><span className="gp-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Looking up</> : 'Lookup'}
          </button>
        </div>
      </DashboardCard>

      {result?.error && (
        <div className="gp-callout gp-callout--danger">{result.error}</div>
      )}

      {result && !result.error && (
        <>
          {result.steps && (
            <DashboardCard title="Pipeline Steps">
              <div>
                {result.steps.map((step: any, i: number) => (
                  <div key={i} className="gp-step">
                    <div className="gp-step__name">{step.step}</div>
                    <div className="gp-step__reason">{step.method}</div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          )}

          <DashboardCard title="Raw Trace">
            <pre className="gp-pre">{JSON.stringify(result, null, 2)}</pre>
          </DashboardCard>
        </>
      )}
    </div>
  )
}

