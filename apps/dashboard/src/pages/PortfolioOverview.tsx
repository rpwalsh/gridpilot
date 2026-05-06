/**
 * Overview — demo fixture display.
 *
 * Two-column layout: Source State | Asset State + Deviation Log
 *
 * DATA STATUS: All values are static demo fixtures representing what a
 * connected 137-asset renewable portfolio would surface. No live SCADA,
 * no live API. The fixture data is sourced from overview.ts and is
 * clearly labeled below.
 */
import { useEffect, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import {
  SYSTEM_METRICS,
  TELEMETRY_INTEGRITY,
  SOURCE_HEALTH,
  PROVIDER_STATUS,
  ASSET_COUNTS,
  ASSET_STATE_ROWS,
  DEVIATION_LOG,
  AUDIT_METADATA,
} from '../lib/overview'

// ── Chart colors ──────────────────────────────────────────────────────────────
const C_GREEN      = '#4ade80'
const C_SLATE      = '#7ab87a'
const C_BORDER     = 'rgba(34,197,94,0.11)'
const C_SURFACE    = '#0b140b'

// ── Tiny status dot ───────────────────────────────────────────────────────────
function Dot({ color }: { color: 'green' | 'amber' | 'red' | 'none' }) {
  const map = { green: '#4ade80', amber: '#fbbf24', red: '#f87171', none: 'transparent' }
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: map[color],
      flexShrink: 0,
    }} />
  )
}

// ── Severity badge (compact, inline) ─────────────────────────────────────────
function SevBadge({ sev }: { sev: string }) {
  const map: Record<string, string> = {
    CRITICAL: '#7f1d1d',
    HIGH:     '#78350f',
    MED:      '#14532d',
    LOW:      '#1e3a5f',
  }
  return (
    <span style={{
      background: map[sev] ?? '#1c1c1c',
      color: sev === 'HIGH' ? '#fbbf24' : sev === 'CRITICAL' ? '#f87171' : sev === 'MED' ? '#4ade80' : '#7ab87a',
      borderRadius: 3, padding: '1px 6px',
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
    }}>
      {sev}
    </span>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.6px', color: '#7ab87a',
      borderBottom: `1px solid ${C_BORDER}`, paddingBottom: '0.4rem',
      marginBottom: '0.5rem',
    }}>
      <span>{title}</span>
      {right && <span style={{ fontWeight: 400, color: '#4a7a4a', textTransform: 'none', letterSpacing: 0 }}>{right}</span>}
    </div>
  )
}

// ── Compact panel wrapper ─────────────────────────────────────────────────────
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C_SURFACE,
      border: `1px solid ${C_BORDER}`,
      borderRadius: 8,
      padding: '0.65rem 0.75rem',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Mini stat (2-column grid within system overview) ─────────────────────────
function MiniStat({ label, value, sub, delta, deltaPos }: {
  label: string; value: string; sub?: string; delta?: string; deltaPos?: boolean
}) {
  return (
    <div style={{ padding: '0.5rem 0.6rem', background: '#0d1a0e', borderRadius: 6, border: `1px solid ${C_BORDER}` }}>
      <div style={{ fontSize: '0.68rem', color: '#4a7a4a', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#d4f0d4', lineHeight: 1 }}>
        {value}
      </div>
      {delta && (
        <div style={{ fontSize: '0.68rem', marginTop: 2, color: deltaPos ? '#4ade80' : '#f87171' }}>
          {deltaPos ? '▲' : '▼'} {delta} vs 60m ago
        </div>
      )}
      {sub && <div style={{ fontSize: '0.68rem', color: '#4a7a4a', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// ── Donut ring (SVG) ──────────────────────────────────────────────────────────
function DonutRing({ pct }: { pct: number }) {
  const R = 40, cx = 52, cy = 52, stroke = 9
  const circ = 2 * Math.PI * R
  const dash  = (pct / 100) * circ
  return (
    <svg width={104} height={104} style={{ display: 'block' }}>
      {/* track */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(34,197,94,0.12)" strokeWidth={stroke} />
      {/* arc */}
      <circle
        cx={cx} cy={cy} r={R} fill="none"
        stroke="#4ade80" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={13} fontWeight={800} fill="#d4f0d4">
        {pct.toFixed(2)}%
      </text>
      <text x={cx} y={cy + 17} textAnchor="middle" fontSize={8} fill="#4a7a4a" fontWeight={600}>
        INTEGRITY
      </text>
    </svg>
  )
}

// ── Clock ─────────────────────────────────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span>{t.toISOString().replace('T', ' ').slice(0, 19)}</span>
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PortfolioOverview() {
  return (
    <>
      {/* ── Demo fixture banner ───────────────────────────────────────────── */}
      <div style={{
        background: '#1a1a0a',
        border: '1px solid rgba(251,191,36,0.3)',
        borderRadius: 6,
        padding: '0.4rem 0.9rem',
        marginBottom: '0.6rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        fontSize: '0.72rem',
      }}>
        <span style={{ color: '#fbbf24', fontWeight: 700 }}>DEMO FIXTURE</span>
        <span style={{ color: '#78716c' }}>|</span>
        <span style={{ color: '#a8a29e' }}>
          Static data representing a disconnected 137-asset portfolio. No live SCADA or API connection.
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '270px 1fr',
        gap: '0.65rem',
        alignItems: 'start',
      }}>

      {/* ════════════════════════════════════════════════════════════════════
          LEFT COLUMN
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

        {/* System Overview */}
        <Panel>
          <SectionHeader title="System Overview" right="All Assets" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
            <MiniStat
              label="Output (MW)"
              value={SYSTEM_METRICS.output_mw.toLocaleString()}
              delta={`${SYSTEM_METRICS.output_delta_pct}%`}
              deltaPos
            />
            <MiniStat
              label="Capacity (%)"
              value={`${SYSTEM_METRICS.capacity_pct}%`}
              delta={`${SYSTEM_METRICS.capacity_delta_pp}pp`}
              deltaPos
            />
            <MiniStat
              label="Telemetry Integrity"
              value={`${SYSTEM_METRICS.telemetry_integrity_pct}%`}
              delta={`${SYSTEM_METRICS.integrity_delta_pp}pp`}
              deltaPos
            />
            <MiniStat
              label="Forecast Confidence"
              value={`${SYSTEM_METRICS.forecast_confidence_pct}%`}
              delta={`${SYSTEM_METRICS.confidence_delta_pp}pp`}
              deltaPos
            />
          </div>
        </Panel>

        {/* Telemetry Integrity */}
        <Panel>
          <SectionHeader title="Telemetry Integrity" right="All Assets" />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <DonutRing pct={SYSTEM_METRICS.telemetry_integrity_pct} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[
                { label: 'Freshness (≤2m)', val: `${TELEMETRY_INTEGRITY.freshness_pct}%` },
                { label: 'Missing Data',    val: `${TELEMETRY_INTEGRITY.missing_pct}%`   },
                { label: 'Bad Quality',     val: `${TELEMETRY_INTEGRITY.bad_quality_pct}%` },
                { label: 'Duplicate/Conflict', val: `${TELEMETRY_INTEGRITY.conflict_pct}%` },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#7ab87a' }}>{r.label}</span>
                  <span style={{ fontWeight: 700, color: '#d4f0d4', fontVariantNumeric: 'tabular-nums' }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Source Health */}
        <Panel>
          <SectionHeader
            title="Source Health"
            right={`${SOURCE_HEALTH.filter(s => s.status === 'GOOD').length} / ${SOURCE_HEALTH.length} Healthy`}
          />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ color: '#4a7a4a' }}>
                <th style={{ textAlign: 'left', paddingBottom: 4, fontWeight: 700 }}>Source</th>
                <th style={{ textAlign: 'left', paddingBottom: 4, fontWeight: 700 }}>Type</th>
                <th style={{ textAlign: 'right', paddingBottom: 4, fontWeight: 700 }}>Fresh</th>
                <th style={{ textAlign: 'right', paddingBottom: 4, fontWeight: 700 }}>Integ.</th>
                <th style={{ paddingBottom: 4 }}></th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_HEALTH.map(s => (
                <tr key={s.source} style={{ borderTop: `1px solid ${C_BORDER}` }}>
                  <td style={{ padding: '3px 0', fontFamily: 'monospace', color: '#d4f0d4' }}>{s.source}</td>
                  <td style={{ color: '#7ab87a' }}>{s.type}</td>
                  <td style={{ textAlign: 'right', color: '#7ab87a', fontVariantNumeric: 'tabular-nums' }}>{s.freshness}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#d4f0d4' }}>
                    {s.integrity ?? '—'}
                  </td>
                  <td style={{ paddingLeft: 6 }}>
                    <Dot color={s.status === 'GOOD' ? 'green' : s.status === 'DEGRADED' ? 'amber' : 'red'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* Provider Status */}
        <Panel>
          <SectionHeader title="Provider Status" right="7 Providers" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ color: '#4a7a4a' }}>
                <th style={{ textAlign: 'left', paddingBottom: 4, fontWeight: 700 }}>Provider</th>
                <th style={{ textAlign: 'left', paddingBottom: 4, fontWeight: 700 }}>Type</th>
                <th style={{ textAlign: 'right', paddingBottom: 4, fontWeight: 700 }}>Latency</th>
                <th style={{ textAlign: 'right', paddingBottom: 4, fontWeight: 700 }}>Quality</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDER_STATUS.map(p => (
                <tr key={p.provider} style={{ borderTop: `1px solid ${C_BORDER}` }}>
                  <td style={{ padding: '3px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Dot color={p.status === 'GOOD' ? 'green' : p.status === 'DEGRADED' ? 'amber' : 'red'} />
                    <span style={{ fontFamily: 'monospace', color: '#d4f0d4', fontSize: '0.68rem' }}>{p.provider}</span>
                  </td>
                  <td style={{ color: '#7ab87a' }}>{p.type}</td>
                  <td style={{ textAlign: 'right', color: '#7ab87a', fontVariantNumeric: 'tabular-nums' }}>{p.latency}</td>
                  <td style={{ textAlign: 'right', color: '#d4f0d4', fontVariantNumeric: 'tabular-nums' }}>{p.quality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT COLUMN
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

        {/* Asset State */}
        <Panel>
          <SectionHeader title="Asset State" />
          {/* Counts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.3rem', marginBottom: '0.6rem' }}>
            {[
              { label: 'Online',  val: ASSET_COUNTS.online,  color: '#4ade80' },
              { label: 'Derated', val: ASSET_COUNTS.derated, color: '#fbbf24' },
              { label: 'Offline', val: ASSET_COUNTS.offline, color: '#f87171' },
              { label: 'Total',   val: ASSET_COUNTS.total,   color: '#d4f0d4' },
            ].map(c => (
              <div key={c.label} style={{ textAlign: 'center', background: '#0d1a0e', borderRadius: 4, padding: '4px 2px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: c.color }}>{c.val}</div>
                <div style={{ fontSize: '0.6rem', color: '#4a7a4a', textTransform: 'uppercase' }}>{c.label}</div>
              </div>
            ))}
          </div>
          {/* Asset type table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ color: '#4a7a4a' }}>
                <th style={{ textAlign: 'left', paddingBottom: 3, fontWeight: 700 }}>Asset Type</th>
                <th style={{ textAlign: 'right', paddingBottom: 3, fontWeight: 700 }}>Output (MW)</th>
                <th style={{ textAlign: 'right', paddingBottom: 3, fontWeight: 700 }}>Cap %</th>
              </tr>
            </thead>
            <tbody>
              {ASSET_STATE_ROWS.map(r => (
                <tr key={r.asset_type} style={{ borderTop: `1px solid ${C_BORDER}` }}>
                  <td style={{ padding: '3px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Dot color={r.status_dot} />
                    <span style={{ color: '#d4f0d4' }}>{r.asset_type}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#d4f0d4' }}>
                    {r.output_mw ?? '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#7ab87a' }}>
                    {r.capacity ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* Deviation Log */}
        <Panel>
          <SectionHeader title="Deviation Log (Real-Time)" right="All" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem' }}>
            <thead>
              <tr style={{ color: '#4a7a4a' }}>
                <th style={{ textAlign: 'left', paddingBottom: 3, fontWeight: 700 }}>Time</th>
                <th style={{ textAlign: 'left', paddingBottom: 3, fontWeight: 700 }}>Asset</th>
                <th style={{ textAlign: 'right', paddingBottom: 3, fontWeight: 700 }}>Δ</th>
                <th style={{ paddingBottom: 3 }}></th>
              </tr>
            </thead>
            <tbody>
              {DEVIATION_LOG.map((d, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${C_BORDER}` }}>
                  <td style={{ padding: '3px 0', fontFamily: 'monospace', color: '#4a7a4a', whiteSpace: 'nowrap' }}>{d.time_utc}</td>
                  <td style={{ color: '#d4f0d4', fontFamily: 'monospace', fontSize: '0.64rem' }}>{d.asset}</td>
                  <td style={{
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                    color: d.deviation.startsWith('−') || d.deviation.startsWith('-') ? '#f87171' : '#4ade80',
                  }}>
                    {d.deviation}
                  </td>
                  <td style={{ paddingLeft: 4 }}><SevBadge sev={d.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* Audit Metadata */}
        <Panel>
          <SectionHeader title="Audit Metadata" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem' }}>
            <tbody>
              {Object.entries(AUDIT_METADATA).map(([k, v]) => (
                <tr key={k} style={{ borderTop: `1px solid ${C_BORDER}` }}>
                  <td style={{ padding: '2px 0', color: '#4a7a4a', userSelect: 'text', whiteSpace: 'nowrap', paddingRight: 8 }}>
                    {k}
                  </td>
                  <td style={{ color: '#d4f0d4', fontFamily: 'monospace', fontSize: '0.63rem', wordBreak: 'break-all' }}>
                    {v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{
            marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${C_BORDER}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: '0.65rem', color: '#4ade80' }}>✓</span>
            <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 600 }}>Verified</span>
            <span style={{ fontSize: '0.6rem', color: '#4a7a4a', marginLeft: 4 }}>Immutable Log</span>
          </div>
        </Panel>

        {/* System Time strip */}
        <Panel style={{ padding: '0.5rem 0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#4a7a4a', textTransform: 'uppercase' }}>System Time (UTC)</div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#d4f0d4', fontWeight: 600 }}>
                <LiveClock />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#4a7a4a', textTransform: 'uppercase' }}>Grid Scope</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>ERCOT</div>
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#4a7a4a', textTransform: 'uppercase' }}>Market</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d4f0d4' }}>DAM</div>
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#4a7a4a', textTransform: 'uppercase' }}>Interval</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d4f0d4' }}>15m</div>
            </div>
          </div>
        </Panel>

      </div>
    </div>
    </>
  )
}
