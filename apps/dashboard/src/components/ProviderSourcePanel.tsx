/**
 * ProviderSourcePanel – source attribution panel.
 *
 * Ported from risklab-ui Badge + Timeline patterns.
 * Shows each provider's status, freshness, cache, and degraded-mode warnings
 * exactly as returned by the /sites/evaluate `sources` block.
 *
 * Dispatch Layer does not depend on fabricated runtime data.  The production path
 * uses real public provider adapters.  Recorded fixtures are used only for
 * tests, CI, offline demos, and failure-mode simulation.
 */
import StatusBadge, { resolveColor } from './StatusBadge'

interface ProviderSource {
  provider: string
  status: string
  freshness_utc?: string
  latency_ms?: number
  cache?: string
  degraded_mode?: string
  fallback?: string
  error?: string
  sample_count?: number
  data_notice?: string
}

interface Props {
  dataMode: string
  sources: ProviderSource[]
  warnings?: string[]
}

const DATA_MODE_LABEL: Record<string, { label: string; color: string; desc: string }> = {
  live:    { label: 'LIVE',    color: 'green',  desc: 'Calling real public provider APIs' },
  fixture: { label: 'FIXTURE', color: 'blue',   desc: 'Offline fixture — tests and reproducible local analysis' },
  hybrid:  { label: 'HYBRID',  color: 'purple', desc: 'Live where reachable; offline fixture fallback' },
}

export default function ProviderSourcePanel({ dataMode, sources, warnings = [] }: Props) {
  const mode = DATA_MODE_LABEL[dataMode] ?? { label: dataMode.toUpperCase(), color: 'slate', desc: '' }

  return (
    <div className="gp-source-panel">
      {/* data_mode pill */}
      <div className="gp-source-panel__header">
        <span className="gp-source-panel__title">Data Sources</span>
        <span className={`gp-badge gp-badge--${mode.color} gp-source-panel__mode-pill`}>
          {mode.label}
        </span>
        {mode.desc && (
          <span className="gp-source-panel__mode-desc">{mode.desc}</span>
        )}
      </div>

      {/* Source table */}
      <table className="gp-source-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Status</th>
            <th>Freshness (UTC)</th>
            <th>Cache</th>
            <th>Latency</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                {s.provider}
              </td>
              <td>
                <StatusBadge
                  label={s.status.replace(/_/g, ' ')}
                  color={resolveColor(s.status)}
                />
              </td>
              <td style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)' }}>
                {s.freshness_utc
                  ? new Date(s.freshness_utc).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </td>
              <td style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)' }}>
                {s.cache ?? '—'}
              </td>
              <td style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)', textAlign: 'right' }}>
                {s.latency_ms != null ? `${s.latency_ms} ms` : '—'}
              </td>
              <td style={{ fontSize: '0.76rem', color: 'var(--gp-text-muted)', maxWidth: 240 }}>
                {s.degraded_mode ?? s.fallback ?? s.data_notice ?? s.error ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="gp-source-panel__warnings">
          {warnings.map((w, i) => (
            <div key={i} className="gp-source-panel__warning-row">
              <span style={{ marginRight: 6 }}>⚠</span>{w}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
