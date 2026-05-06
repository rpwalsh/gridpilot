/**
 * AuditTimeline – risklab-ui Timeline pattern ported into GridPilot design system.
 *
 * Port of risklab-ui Timeline / TimelineItem / TimelineDot / TimelineConnector
 * adapted to use GridPilot CSS variables.  Renders an L→G→P→D pipeline audit
 * trace as a vertical timeline with step names, reasoning, and I/O metadata.
 */

interface AuditStep {
  step: string
  reasoning?: string
  inputs?: Record<string, unknown>
  output?: unknown
  timestamp?: string
}

interface AuditTimelineProps {
  steps: AuditStep[]
  traceId?: string
  modelVersions?: Record<string, string>
}

const STEP_COLORS: Record<string, string> = {
  L_local_signal_scoring:     'var(--gp-blue)',
  G_structural_summarization: 'var(--gp-teal)',
  P_predictive_evolution:     'var(--gp-purple)',
  D_decision_ranking:         'var(--gp-green)',
  structural_drift_detection: 'var(--gp-amber)',
}

const STEP_ICONS: Record<string, string> = {
  L_local_signal_scoring:     'L',
  G_structural_summarization: 'G',
  P_predictive_evolution:     'P',
  D_decision_ranking:         'D',
  structural_drift_detection: '⚡',
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return JSON.stringify(v)
}

export default function AuditTimeline({ steps, traceId, modelVersions }: AuditTimelineProps) {
  return (
    <div className="gp-audit-timeline">
      {/* Header */}
      {(traceId || modelVersions) && (
        <div className="gp-audit-timeline__header">
          {traceId && (
            <span>
              Trace&nbsp;
              <code className="gp-code-inline">{traceId}</code>
            </span>
          )}
          {modelVersions && Object.entries(modelVersions).map(([k, v]) => (
            <span key={k} style={{ color: 'var(--gp-text-muted)' }}>
              {k}: <strong>{v}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Timeline items */}
      <div className="gp-timeline">
        {steps.map((step, i) => {
          const color = STEP_COLORS[step.step] ?? 'var(--gp-slate)'
          const icon  = STEP_ICONS[step.step]  ?? String(i + 1)
          const isLast = i === steps.length - 1

          return (
            <div key={i} className="gp-timeline__item">
              {/* Gutter: dot + connector */}
              <div className="gp-timeline__gutter">
                <div
                  className="gp-timeline__dot"
                  style={{ background: color, borderColor: color }}
                  title={step.step}
                >
                  {icon}
                </div>
                {!isLast && <div className="gp-timeline__connector" />}
              </div>

              {/* Content */}
              <div className="gp-timeline__content">
                <div className="gp-timeline__step-name" style={{ color }}>
                  {step.step.replace(/_/g, ' ')}
                </div>
                {step.reasoning && (
                  <div className="gp-timeline__reasoning">{step.reasoning}</div>
                )}
                {(step.inputs || step.output != null) && (
                  <div className="gp-timeline__meta">
                    {step.inputs && Object.entries(step.inputs).filter(([, v]) => v != null).map(([k, v]) => (
                      <div key={k} className="gp-timeline__kv">
                        <span className="gp-timeline__kv-key">{k}:</span>
                        <span className="gp-timeline__kv-val">{renderValue(v)}</span>
                      </div>
                    ))}
                    {step.output != null && (
                      <div className="gp-timeline__kv">
                        <span className="gp-timeline__kv-key" style={{ color }}>output:</span>
                        <span className="gp-timeline__kv-val">{renderValue(step.output)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
