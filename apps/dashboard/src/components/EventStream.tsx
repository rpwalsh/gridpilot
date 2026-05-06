/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

/**
 * EventStream â€” structured signal event table.
 *
 * Columns: Time | Source | Channel | Metric | Observed | Expected | Delta | State
 * No prose column. No labels. No descriptions.
 * Every string is a label, value, unit, or state code.
 */

const STATE_COLORS: Record<string, string> = {
  CRITICAL: 'var(--gp-red)',
  HIGH:     'var(--gp-amber)',
  WATCH:    'var(--gp-blue)',
  NOMINAL:  'var(--gp-green)',
  STALE:    'var(--gp-slate)',
  MISSING:  'var(--gp-slate)',
  CONFLICT: 'var(--gp-purple)',
}

export interface SignalEvent {
  signal_id:      string
  timestamp_utc:  string
  source:         string
  channel:        string
  metric:         string
  observed_value: number
  expected_value: number | null
  delta:          number | null
  unit:           string
  state:          string
  audit_hash:     string
}

export default function EventStream({ events }: { events: SignalEvent[] }) {
  if (!events.length) return null
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="gp-table" style={{ width: '100%', fontSize: '0.8rem' }}>
        <thead>
          <tr>
            <th>Time (UTC)</th>
            <th>Source</th>
            <th>Channel</th>
            <th>Metric</th>
            <th style={{ textAlign: 'right' }}>Observed</th>
            <th style={{ textAlign: 'right' }}>Expected</th>
            <th style={{ textAlign: 'right' }}>Delta</th>
            <th>State</th>
            <th style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>Audit</th>
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.signal_id}>
              <td style={{ fontFamily: 'monospace', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                {new Date(e.timestamp_utc).toISOString().replace('T', ' ').slice(0, 19)}
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{e.source}</td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--gp-text-muted)' }}>{e.channel}</td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{e.metric}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {e.observed_value.toFixed(1)} <span style={{ color: 'var(--gp-text-muted)', fontSize: '0.7rem' }}>{e.unit}</span>
              </td>
              <td style={{ textAlign: 'right', color: 'var(--gp-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {e.expected_value != null ? `${e.expected_value.toFixed(1)} ${e.unit}` : 'â€”'}
              </td>
              <td style={{
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                color: e.delta != null && e.delta < 0 ? 'var(--gp-red)' : e.delta != null && e.delta > 0 ? 'var(--gp-green)' : 'var(--gp-text-muted)',
              }}>
                {e.delta != null ? `${e.delta > 0 ? '+' : ''}${e.delta.toFixed(1)} ${e.unit}` : 'â€”'}
              </td>
              <td>
                <span style={{
                  background: STATE_COLORS[e.state] ?? 'var(--gp-slate)',
                  color: '#fff',
                  borderRadius: 3,
                  padding: '2px 7px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}>
                  {e.state}
                </span>
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--gp-text-muted)' }}>
                {e.audit_hash}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
