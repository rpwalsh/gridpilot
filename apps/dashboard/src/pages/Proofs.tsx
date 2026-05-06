import { useEffect, useMemo, useState } from 'react'
import {
  ComposedChart, BarChart, Area, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
} from 'recharts'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import HelixDisplay from '../components/HelixDisplay'
import type { ProofDataset } from '../lib/proofs/types'
import { loadProofDataset, PROOF_SNAPSHOT_PATH } from '../lib/proofs/loadProofDataset'
import { computeForecastBand } from '../lib/proofs/computeForecastBand'
import { computeProofMetrics } from '../lib/proofs/computeProofMetrics'
import { computeSpectralView } from '../lib/proofs/computeSpectralView'

// ── Color tokens ──────────────────────────────────────────────────────────────
const BLUE      = 'var(--gp-blue)'
const GREEN     = '#4ade80'
const SLATE     = '#7ab87a'
const BAND_FILL = 'rgba(217,119,6,0.10)'
const BAND_LINE = 'rgba(217,119,6,0.32)'

const TOOLTIP_STYLE = {
  background: '#0b140b',
  border: '1px solid rgba(34,197,94,0.18)',
  borderRadius: 8,
  fontSize: 11,
  color: '#d4f0d4',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const visible = (payload as { dataKey: string; name: string; value: number; color: string }[])
    .filter(p => p.dataKey !== 'band_low' && p.dataKey !== 'band_width')
  if (!visible.length) return null
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: '0.5rem 0.75rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#d4f0d4' }}>{label}</div>
      {visible.map(item => (
        <div key={item.dataKey} style={{ color: item.color, marginBottom: 2 }}>
          {item.name}: {typeof item.value === 'number' ? item.value.toFixed(3) : item.value}
        </div>
      ))}
    </div>
  )
}

// ── Empty instrument state ────────────────────────────────────────────────────
function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <div>
          <h1 className="gp-page-title">Back-Test</h1>
          <p className="gp-page-subtitle">Training Window / Holdout Window / Forecast Band / Signal View</p>
        </div>
      </div>

      <div style={{
        fontFamily: 'monospace', fontSize: '0.85rem',
        padding: '1.5rem', lineHeight: 2,
        background: 'var(--gp-slate-bg)',
        border: '1px solid var(--gp-border)',
        borderRadius: 'var(--gp-radius-sm)',
        color: 'var(--gp-text-secondary)',
      }}>
        <div>DATASET_STATE: {loading ? 'LOADING' : 'NOT_LOADED'}</div>
        {!loading && (
          <>
            <div style={{ marginTop: '0.5rem' }}>
              REQUIRED_FILE: {PROOF_SNAPSHOT_PATH}
            </div>
            <div>ACCEPTED_FORMATS: JSON (dispatchlayer.proof.weather.v1)</div>
            <div style={{ marginTop: '0.5rem', color: 'var(--gp-text-muted)', fontSize: '0.78rem' }}>
              To populate this page, run:
            </div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', color: '#4ade80' }}>
              python scripts/capture_weather_snapshot.py \
            </div>
            <div style={{ fontSize: '0.78rem', color: '#4ade80', paddingLeft: '2ch' }}>
              --lat 31.97 --lon -102.08 \
            </div>
            <div style={{ fontSize: '0.78rem', color: '#4ade80', paddingLeft: '2ch' }}>
              --start 2000-01-01 --end 2024-12-31 \
            </div>
            <div style={{ fontSize: '0.78rem', color: '#4ade80', paddingLeft: '2ch' }}>
              --out data/source_snapshots/weather/open_meteo_west_texas_monthly_2000_2024.json
            </div>
            <div style={{ marginTop: '0.75rem', color: 'var(--gp-text-muted)', fontSize: '0.78rem' }}>
              Then copy to: apps/dashboard/public{PROOF_SNAPSHOT_PATH}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Loaded proof renderer ─────────────────────────────────────────────────────
function ProofRenderer({ dataset }: { dataset: ProofDataset }) {
  const { training, holdout, bands, primary_field } = useMemo(
    () => computeForecastBand(dataset),
    [dataset],
  )

  const metrics = useMemo(
    () => computeProofMetrics(bands, training.length),
    [bands, training.length],
  )

  const spectral = useMemo(() => {
    const getVal = (r: typeof training[0]): number | null => {
      if (r.observed != null) return r.observed
      if (r.shortwave_radiation_sum_mjm2 != null) return r.shortwave_radiation_sum_mjm2
      if (r.wind_speed_10m_max_ms != null) return r.wind_speed_10m_max_ms
      return null
    }
    const trainingVals = training.map(getVal).filter((v): v is number => v != null)
    const holdoutVals  = holdout.map(getVal).filter((v): v is number => v != null)
    return computeSpectralView(trainingVals, holdoutVals)
  }, [training, holdout])

  // Annual history from training: group by year
  const annualHistory = useMemo(() => {
    const byYear: Record<number, number[]> = {}
    for (const rec of training) {
      const getVal = (): number | null => {
        if (rec.observed != null) return rec.observed
        if (rec.shortwave_radiation_sum_mjm2 != null) return rec.shortwave_radiation_sum_mjm2
        if (rec.wind_speed_10m_max_ms != null) return rec.wind_speed_10m_max_ms
        return null
      }
      const v = getVal()
      if (v == null) continue
      byYear[rec.year] = byYear[rec.year] ?? []
      byYear[rec.year].push(v)
    }
    return Object.entries(byYear)
      .map(([year, vals]) => ({
        year: Number(year),
        mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      }))
      .sort((a, b) => a.year - b.year)
  }, [training])

  const forecastChartData = bands.map(b => ({
    label:      b.label,
    band_low:   b.p10,
    band_width: b.p90 - b.p10,
    p50:        b.p50,
    actual:     b.actual,
  }))

  const residualChartData = bands
    .filter(b => b.residual != null)
    .map(b => ({ label: b.label, residual: b.residual! }))

  const spectralByLabel: Record<string, { label: string; Training?: number; Holdout?: number }> = {}
  for (const bin of spectral) {
    spectralByLabel[bin.label] = spectralByLabel[bin.label] ?? { label: bin.label }
    if (bin.series === 'training') spectralByLabel[bin.label].Training = bin.amplitude
    else spectralByLabel[bin.label].Holdout = bin.amplitude
  }
  const spectralChartData = Object.values(spectralByLabel)

  const coveragePct = Math.round(metrics.coverage_rate * 100)
  const src = dataset.source_record
  const holdoutStart = dataset.windows.holdout.start_utc.slice(0, 10)
  const holdoutEnd   = dataset.windows.holdout.end_utc.slice(0, 10)
  const trainingStart = dataset.windows.training.start_utc.slice(0, 10)
  const trainingEnd   = dataset.windows.training.end_utc.slice(0, 10)

  return (
    <div className="gp-grid">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="gp-page-header">
        <div>
          <h1 className="gp-page-title">Back-Test</h1>
          <p className="gp-page-subtitle">
            Training Window / Holdout Window / Forecast Band / Signal View
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <StatusBadge label={`Training ${trainingStart} – ${trainingEnd}`} color="slate" />
          <StatusBadge label={`Holdout ${holdoutStart} – ${holdoutEnd}`}   color="purple" />
          <StatusBadge label={`N = ${metrics.training_count}`}             color="slate" />
          <StatusBadge label={`N = ${metrics.holdout_count}`}              color="blue"  />
        </div>
      </div>

      {/* ── Leakage marker ────────────────────────────────────────────────── */}
      <div style={{
        fontSize: '0.78rem', fontFamily: 'monospace',
        padding: '0.45rem 0.75rem',
        background: 'var(--gp-slate-bg)',
        border: '1px solid var(--gp-border)',
        borderRadius: 'var(--gp-radius-sm)',
        color: 'var(--gp-text-secondary)',
      }}>
        LEAKAGE_STATE: EXCLUDED — forecast generated from training window only
        · holdout actuals excluded from training · used for post-hoc validation only
        · FORECAST_LOCK: {trainingEnd} · HOLDOUT_START: {holdoutStart}
      </div>

      {/* ── Metric strip ──────────────────────────────────────────────────── */}
      <div className="gp-stat-grid">
        <StatCard
          label="Band Coverage"
          value={`${coveragePct}%`}
          sub={`${metrics.inside_band} inside / ${metrics.outside_band} outside band`}
          accent={coveragePct >= 80 ? 'var(--gp-green)' : coveragePct >= 60 ? 'var(--gp-amber)' : 'var(--gp-red)'}
        />
        <StatCard label="MAE"       value={metrics.mae.toFixed(3)}       accent={BLUE} />
        <StatCard label="RMSE"      value={metrics.rmse.toFixed(3)}      accent={BLUE} />
        <StatCard label="MAPE"      value={`${metrics.mape.toFixed(1)}%`} accent="var(--gp-purple)" />
        <StatCard
          label="Bias"
          value={`${metrics.bias >= 0 ? '+' : ''}${metrics.bias.toFixed(3)}`}
          sub="mean residual"
          accent={Math.abs(metrics.bias) < 1 ? 'var(--gp-green)' : 'var(--gp-amber)'}
        />
        <StatCard label="Max Error" value={metrics.max_abs_error.toFixed(3)} accent="var(--gp-red)" />
      </div>

      {/* ── Forecast Band ─────────────────────────────────────────────────── */}
      <DashboardCard
        title="Forecast Band — Holdout Window"
        subtitle={`P10 / P50 / P90 vs observed · source: ${src.provider} · field: ${primary_field}`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={forecastChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: SLATE }} />
            <YAxis tick={{ fontSize: 11, fill: SLATE }} />
            <Tooltip content={<ForecastTooltip />} />
            <Area
              dataKey="band_low"  stackId="band"
              fillOpacity={0}     stroke="none"     legendType="none"
            />
            <Area
              dataKey="band_width" stackId="band"
              fill={BAND_FILL}    stroke={BAND_LINE}
              strokeWidth={1}     strokeDasharray="4 2"
              legendType="square" name="Forecast Band (P10-P90)"
            />
            <Line dataKey="p50"    stroke={BLUE}  strokeWidth={2}   dot={false} name="P50 Forecast" />
            <Line
              dataKey="actual" stroke={GREEN} strokeWidth={2.5}
              dot={{ r: 4, fill: GREEN, strokeWidth: 0 }}
              name="Observed"
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: SLATE }} />
          </ComposedChart>
        </ResponsiveContainer>
      </DashboardCard>

      {/* ── Training Window + Residual ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        <DashboardCard
          title="Training Window"
          subtitle={`Annual mean by year · ${trainingStart} – ${trainingEnd} · ${primary_field}`}
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={annualHistory} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: SLATE }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: SLATE }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [v.toFixed(3), 'Annual mean']}
              />
              <Line dataKey="mean" stroke={BLUE} strokeWidth={1.5} dot={false} name="Annual Mean" />
              <ReferenceLine
                x={Number(holdoutStart.slice(0, 4))}
                stroke="var(--gp-purple)" strokeDasharray="4 2" strokeWidth={1.5}
                label={{ value: 'holdout', position: 'insideTopRight', fontSize: 9, fill: 'var(--gp-purple)' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </DashboardCard>

        <DashboardCard
          title="Residual Field — Holdout"
          subtitle="Observed minus P50 forecast · sign indicates over/under"
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={residualChartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: SLATE }} />
              <YAxis tick={{ fontSize: 10, fill: SLATE }} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v.toFixed(3)}`, 'Residual']}
              />
              <ReferenceLine y={0} stroke="var(--gp-border)" strokeWidth={1.5} />
              <Bar dataKey="residual" radius={[3, 3, 0, 0]} name="Residual">
                {residualChartData.map((d, i) => (
                  <Cell key={i} fill={d.residual >= 0 ? GREEN : '#f87171'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </DashboardCard>

      </div>

      {/* ── Signal View ───────────────────────────────────────────────────── */}
      <DashboardCard
        title="Signal View"
        subtitle="DFT amplitude by period — computed from loaded source data · training / holdout"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={spectralChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: SLATE }} />
            <YAxis tick={{ fontSize: 11, fill: SLATE }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: SLATE }} />
            <Bar dataKey="Training" fill={SLATE} radius={[3, 3, 0, 0]} opacity={0.7} />
            <Bar dataKey="Holdout"  fill={GREEN} radius={[3, 3, 0, 0]} opacity={0.9} />
          </BarChart>
        </ResponsiveContainer>
      </DashboardCard>

      {/* ── Temporal Playback ─────────────────────────────────────────────── */}
      <DashboardCard
        title="Replay — Signal Pattern"
        subtitle="365-day x 24-hour deviation field · color: -3s teal to 0 green to +3s gold"
      >
        <HelixDisplay />
      </DashboardCard>

      {/* ── Holdout Table ─────────────────────────────────────────────────── */}
      <DashboardCard title="Holdout Window — Monthly Detail">
        <table className="gp-table">
          <thead>
            <tr>
              <th>Period</th>
              <th style={{ textAlign: 'right' }}>P10</th>
              <th style={{ textAlign: 'right' }}>P50</th>
              <th style={{ textAlign: 'right' }}>P90</th>
              <th style={{ textAlign: 'right' }}>Observed</th>
              <th style={{ textAlign: 'right' }}>Residual</th>
              <th style={{ textAlign: 'right' }}>Error %</th>
              <th style={{ textAlign: 'center' }}>Band State</th>
            </tr>
          </thead>
          <tbody>
            {bands.map(b => {
              const errPct = b.p50 !== 0 && b.residual != null
                ? ((b.residual / b.p50) * 100).toFixed(1)
                : null
              return (
                <tr key={b.label}>
                  <td style={{ fontWeight: 600 }}>{b.label}</td>
                  <td style={{ textAlign: 'right', color: 'var(--gp-text-muted)', fontSize: '0.8rem' }}>
                    {b.p10.toFixed(3)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--gp-text-secondary)' }}>
                    {b.p50.toFixed(3)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--gp-text-muted)', fontSize: '0.8rem' }}>
                    {b.p90.toFixed(3)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {b.actual != null ? b.actual.toFixed(3) : '—'}
                  </td>
                  <td style={{
                    textAlign: 'right', fontWeight: 600,
                    color: b.residual != null ? (b.residual >= 0 ? GREEN : '#f87171') : 'var(--gp-text-muted)',
                  }}>
                    {b.residual != null
                      ? `${b.residual >= 0 ? '+' : ''}${b.residual.toFixed(3)}`
                      : '—'}
                  </td>
                  <td style={{
                    textAlign: 'right',
                    color: errPct && Math.abs(Number(errPct)) > 15 ? '#ef4444' : 'var(--gp-text-secondary)',
                  }}>
                    {errPct != null ? `${Number(errPct) >= 0 ? '+' : ''}${errPct}%` : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {b.in_band === null
                      ? <StatusBadge label="NO_DATA" color="slate" />
                      : <StatusBadge label={b.in_band ? 'INSIDE' : 'OUTSIDE'} color={b.in_band ? 'green' : 'red'} />
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </DashboardCard>

      {/* ── Source Record ─────────────────────────────────────────────────── */}
      <DashboardCard title="Source Record">
        <table className="gp-table">
          <tbody>
            {([
              ['dataset_id',       dataset.dataset_id],
              ['schema_version',   dataset.schema_version],
              ['provider',         src.provider],
              ['source_type',      src.source_type],
              ['captured_at_utc',  src.captured_at_utc],
              ['source_url',       src.source_url],
              ['query_start',      src.query.start],
              ['query_end',        src.query.end],
              ['record_count',     String(dataset.integrity.record_count)],
              ['missing_count',    String(dataset.integrity.missing_count)],
              ['content_sha256',   dataset.integrity.content_sha256 || '(not computed)'],
              ['primary_field',    primary_field],
            ] as [string, string][]).map(([k, v]) => (
              <tr key={k}>
                <td style={{
                  fontFamily: 'monospace', fontSize: '0.78rem',
                  color: 'var(--gp-text-muted)', width: '220px', userSelect: 'all',
                }}>
                  {k}
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--gp-text-primary)', wordBreak: 'break-all' }}>
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DashboardCard>

    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Proofs() {
  const [dataset, setDataset] = useState<ProofDataset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProofDataset().then(d => {
      setDataset(d)
      setLoading(false)
    })
  }, [])

  if (loading || !dataset) {
    return <EmptyState loading={loading} />
  }

  return <ProofRenderer dataset={dataset} />
}
