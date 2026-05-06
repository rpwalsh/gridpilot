/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useState, useEffect } from 'react'
import axios from 'axios'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'

interface ConnectorRow {
  connector:     string
  protocol:      string
  state:         string
  sample_count?: number
  error:         string | null
  [key: string]: any
}

const PROTOCOL_DESCRIPTIONS: Record<string, string> = {
  'OTLP':           'OpenTelemetry/OTLP â€” platform service observability',
  'OPC UA':         'OPC UA â€” industrial SCADA interoperability (read-only)',
  'MQTT':           'MQTT â€” edge telemetry stream subscriber (read-only)',
  'AWS SiteWise':   'AWS IoT SiteWise â€” industrial asset time-series (read-only)',
  'S3/Parquet':     'S3/Parquet â€” historical archive replay (read-only)',
}

export default function PipelineState() {
  const [connectors, setConnectors] = useState<ConnectorRow[]>([])
  const [timestamp, setTimestamp] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchState = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get('/api/v1/connectors/state')
      setConnectors(r.data.connectors)
      setTimestamp(r.data.timestamp_utc)
    } catch {
      setError('Could not reach API â€” ensure the API is running')
    }
    setLoading(false)
  }

  useEffect(() => { fetchState() }, [])

  const runningCount = connectors.filter(c => c.state === 'RUNNING').length
  const errorCount   = connectors.filter(c => c.state === 'ERROR').length

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Pipeline State</h1>
        <p className="gp-page-subtitle">
          Connector state â€” source freshness, sample counts, quality codes, and protocol status.
          All connectors are read-only. No command or control paths.
        </p>
      </div>

      {connectors.length > 0 && (
        <div className="gp-stat-grid">
          <StatCard label="Connectors" value={connectors.length} />
          <StatCard label="Running"    value={runningCount} accent="var(--gp-green)" />
          <StatCard label="Errors"     value={errorCount}   accent={errorCount > 0 ? 'var(--gp-red)' : 'var(--gp-green)'} />
          <StatCard label="Polled UTC" value={timestamp ? new Date(timestamp).toISOString().slice(11, 19) : 'â€”'} sub="last state poll" />
        </div>
      )}

      <DashboardCard title="Connector Matrix">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <button onClick={fetchState} disabled={loading} className="gp-btn gp-btn--primary" style={{ fontSize: '0.8rem' }}>
            {loading ? <><span className="gp-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Pollingâ€¦</> : 'Poll State'}
          </button>
        </div>

        {error && <div className="gp-callout gp-callout--danger">{error}</div>}

        {connectors.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="gp-table" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Connector</th>
                  <th>Protocol</th>
                  <th>State</th>
                  <th style={{ textAlign: 'right' }}>Samples</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {connectors.map(c => (
                  <tr key={c.connector}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                      {c.connector}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--gp-text-secondary)' }}>
                      {c.protocol}
                    </td>
                    <td>
                      <StatusBadge
                        label={c.state}
                        color={c.state === 'RUNNING' ? 'green' : c.state === 'DEGRADED' ? 'amber' : 'red'}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {c.sample_count ?? 'â€”'}
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--gp-text-muted)' }}>
                      {c.error
                        ? <span style={{ color: 'var(--gp-red)' }}>{c.error}</span>
                        : PROTOCOL_DESCRIPTIONS[c.protocol] ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      <DashboardCard title="Protocol Reference">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {[
            { id: 'OPC_UA',     name: 'OPC UA',               purpose: 'SCADA interoperability',     note: 'IEC 62541 â€” industrial read-only' },
            { id: 'MQTT',       name: 'MQTT',                  purpose: 'Edge telemetry stream',      note: 'pub-sub â€” read-only subscriber' },
            { id: 'SITEWISE',   name: 'AWS IoT SiteWise',      purpose: 'Industrial asset data',      note: 'TQV â€” batch property read' },
            { id: 'OTLP',       name: 'OpenTelemetry/OTLP',   purpose: 'Platform observability',     note: 'API latency / trace / metrics' },
            { id: 'S3_PARQUET', name: 'S3/Parquet archive',   purpose: 'Historical replay',           note: 'holdout validation / proofs' },
          ].map(p => (
            <div key={p.id} style={{
              padding: '0.75rem',
              border: '1px solid var(--gp-border)',
              borderRadius: 6,
              background: 'var(--gp-surface)',
            }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', marginBottom: 4 }}>{p.id}</div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--gp-text-primary)', marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--gp-text-secondary)' }}>{p.purpose}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gp-text-muted)', marginTop: 3 }}>{p.note}</div>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  )
}
