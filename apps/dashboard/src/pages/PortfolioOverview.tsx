/**
 * Overview — full instrumentation dashboard.
 *
 * Three-column layout: Source State | Forecast Envelope | Asset State + Deviation Log
 * All data is deterministic fixture data.  No generated prose.
 */
import { useMemo, useEffect, useState } from 'react'
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
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
  PROOF_METRICS,
  generateForecastSeries,
} from '../lib/overview'

// ── Chart colors ──────────────────────────────────────────────────────────────
const C_GOLD       = '#d97706'
const C_GOLD_BAND  = 'rgba(217,119,6,0.13)'
const C_GOLD_LINE  = 'rgba(217,119,6,0.35)'
const C_GREEN      = '#4ade80'
const C_SLATE      = '#7ab87a'
const C_BORDER     = 'rgba(34,197,94,0.11)'
const C_SURFACE    = '#0b140b'
const TOOLTIP_STYLE = {
  background: '#0b140b',
  border: '1px solid rgba(34,197,94,0.18)',
  borderRadius: 8,
  fontSize: 11,
  color: '#d4f0d4',
}

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

// ── Forecast tooltip ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FcTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const rows = (payload as { dataKey: string; name: string; value: number; color: string }[])
    .filter(p => p.dataKey !== 'band_low' && p.dataKey !== 'band_width' && p.value != null)
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: '0.5rem 0.7rem', minWidth: 160 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#d4f0d4' }}>{label}</div>
      {rows.map(r => (
        <div key={r.dataKey} style={{ color: r.color, marginBottom: 1, fontSize: 11 }}>
          {r.name}: {Math.round(r.value).toLocaleString()} MW
        </div>
      ))}
    </div>
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
  // generateForecastSeries is deterministic (seeded LCG) — caching once per mount is intentional.
  const forecast = useMemo(() => generateForecastSeries(), [])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '270px 1fr 290px',
      gap: '0.65rem',
      alignItems: 'start',
      minHeight: 'calc(100vh - 120px)',
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
          CENTER COLUMN
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

        {/* Forecast Envelope hero */}
        <Panel style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7ab87a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Forecast Envelope — Total Generation (MW)
              </div>
              <div style={{ fontSize: '0.68rem', color: '#4a7a4a', marginTop: 1 }}>
                P10 / P50 / P90 + Observed · 14-day window · ERCOT
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, border: `1px solid ${C_BORDER}`, fontSize: '0.72rem', color: '#7ab87a' }}>7D</span>
              <span style={{ padding: '2px 8px', borderRadius: 4, border: `1px solid ${C_BORDER}`, fontSize: '0.72rem', color: '#7ab87a' }}>1D</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={forecast} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C_SLATE }} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 10, fill: C_SLATE }} />
              <Tooltip content={<FcTooltip />} />
              <ReferenceLine x="May 21" stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1.5}
                label={{ value: 'NOW', position: 'top', fontSize: 9, fill: '#fbbf24' }} />
              {/* Band */}
              <Area dataKey="band_low"  stackId="b" fillOpacity={0} stroke="none" legendType="none" />
              <Area dataKey="band_width" stackId="b"
                fill={C_GOLD_BAND} stroke={C_GOLD_LINE} strokeWidth={1} strokeDasharray="5 3"
                legendType="square" name="P10–P90 Band"
              />
              <Line dataKey="p50"    stroke={C_GOLD}  strokeWidth={1.8} dot={false} name="P50" />
              <Line dataKey="actual" stroke={C_GREEN} strokeWidth={2.5}
                dot={{ r: 3, fill: C_GREEN, strokeWidth: 0 }}
                connectNulls={false} name="Observed"
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10, color: C_SLATE }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        {/* Proofs & Validation mini-strip */}
        <Panel>
          <SectionHeader title="Proofs &amp; Validation" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {/* Training window bar */}
            <div>
              <div style={{ fontSize: '0.68rem', color: '#4a7a4a', marginBottom: '0.3rem' }}>Training Data</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d4f0d4' }}>2000–2024</div>
              <div style={{ fontSize: '0.68rem', color: '#7ab87a' }}>25 Years</div>
              {/* Mini timeline bar */}
              <div style={{ marginTop: '0.4rem', position: 'relative', height: 12, background: 'rgba(34,197,94,0.08)', borderRadius: 2 }}>
                <div style={{
                  position: 'absolute', left: 0, width: '96%', height: '100%',
                  background: 'rgba(74,222,128,0.3)', borderRadius: '2px 0 0 2px',
                }} />
                <div style={{
                  position: 'absolute', right: 0, width: '4%', height: '100%',
                  background: 'rgba(167,139,250,0.6)',
                }} />
                <span style={{ position: 'absolute', right: 0, top: 14, fontSize: '0.62rem', color: '#a78bfa' }}>2025</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: '#4a7a4a', marginTop: 16 }}>
                <span>2000</span><span>2010</span><span>2020</span><span>2024</span>
              </div>
            </div>
            {/* Holdout performance */}
            <div>
              <div style={{ fontSize: '0.68rem', color: '#4a7a4a', marginBottom: '0.3rem' }}>Holdout Performance (2025 YTD)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                {[
                  { label: 'Coverage',    val: `${PROOF_METRICS.coverage}%`,  note: 'p10–p90' },
                  { label: 'Calibration', val: `${PROOF_METRICS.calibration}%`, note: 'p50 bias' },
                  { label: 'MAE',         val: `${PROOF_METRICS.mae} MW`,      note: '' },
                  { label: 'WAPE',        val: `${PROOF_METRICS.wape}%`,       note: '' },
                  { label: 'RMSE',        val: `${PROOF_METRICS.rmse} MW`,     note: '' },
                  { label: 'R²',          val: `${PROOF_METRICS.r_squared}`,     note: '' },
                ].map(m => (
                  <div key={m.label} style={{ background: '#0d1a0e', borderRadius: 4, padding: '4px 6px' }}>
                    <div style={{ fontSize: '0.6rem', color: '#4a7a4a', textTransform: 'uppercase' }}>{m.label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#d4f0d4' }}>{m.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Spectral + Helix placeholder row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <Panel>
            <SectionHeader title="Spectral Agreement" />
            <div style={{
              height: 130,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8,
            }}>
              {/* Mini spectral bars */}
              {[
                { f: 'Annual',      h: 85, fc: 88, ac: 84 },
                { f: 'Semi-annual', h: 52, fc: 49, ac: 53 },
                { f: 'Quarterly',   h: 28, fc: 31, ac: 26 },
                { f: 'Tri-monthly', h: 18, fc: 16, ac: 19 },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                  <span style={{ fontSize: '0.62rem', color: '#4a7a4a', width: 70, flexShrink: 0 }}>{b.f}</span>
                  <div style={{ flex: 1, display: 'flex', gap: 2, height: 10 }}>
                    <div style={{ width: `${b.h}%`, background: 'rgba(122,184,122,0.5)', borderRadius: 1 }} />
                    <div style={{ width: `${b.fc}%`, background: 'rgba(217,119,6,0.6)', borderRadius: 1 }} />
                    <div style={{ width: `${b.ac}%`, background: 'rgba(74,222,128,0.7)', borderRadius: 1 }} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[['Hist', 'rgba(122,184,122,0.5)'], ['Fcst', 'rgba(217,119,6,0.6)'], ['Obs', 'rgba(74,222,128,0.7)']].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 10, height: 6, background: c, borderRadius: 1 }} />
                    <span style={{ fontSize: '0.6rem', color: '#4a7a4a' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
          <Panel>
            <SectionHeader title="Temporal Playback" />
            <div style={{
              height: 130,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4a7a4a', fontSize: '0.72rem', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ fontSize: '0.65rem', color: '#4a7a4a', marginBottom: 4 }}>
                365d × 24h deviation field
              </div>
              {/* Mini helix preview — color strip */}
              {Array.from({ length: 8 }).map((_, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 1 }}>
                  {Array.from({ length: 24 }).map((_, ci) => {
                    const t = (ci / 23 + ri / 8) / 2
                    const r = Math.round(14 + t * (251 - 14))
                    const g = Math.round(116 + t * (191 - 116))
                    const b = Math.round(144 - t * (144 - 36))
                    return (
                      <div key={ci} style={{
                        width: 5, height: 5, borderRadius: 1,
                        background: `rgb(${r},${g},${b})`,
                        opacity: 0.6 + 0.4 * Math.sin(Math.PI * ci / 23),
                      }} />
                    )
                  })}
                </div>
              ))}
              <div style={{ fontSize: '0.6rem', color: '#4a7a4a', marginTop: 4 }}>
                → Full helix on Proofs page
              </div>
            </div>
          </Panel>
        </div>

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
  )
}
