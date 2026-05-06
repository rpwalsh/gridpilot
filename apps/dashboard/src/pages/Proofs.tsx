/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useMemo } from 'react'
import {
  ComposedChart, BarChart, Area, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
} from 'recharts'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import HelixDisplay from '../components/HelixDisplay'
import { generateProofResult } from '../lib/proofs'

// â”€â”€ Color tokens â€” dark green + gold theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BLUE      = 'var(--gp-blue)'         // gold via CSS var
const GREEN     = '#4ade80'                 // bright green for dark mode
const SLATE     = '#7ab87a'                 // medium green for tick labels
const BAND_FILL = 'rgba(217,119,6,0.10)'   // gold-tinted band fill
const BAND_LINE = 'rgba(217,119,6,0.32)'   // gold band border

const TOOLTIP_STYLE = {
  background: '#0b140b',
  border: '1px solid rgba(34,197,94,0.18)',
  borderRadius: 8,
  fontSize: 11,
  color: '#d4f0d4',
}

// â”€â”€ Custom tooltip: strips band internals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          {item.name}: {Math.round(item.value).toLocaleString()} MWh
        </div>
      ))}
    </div>
  )
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Proofs() {
  const result = useMemo(() => generateProofResult(), [])
  const { annual_history, monthly_2025, metrics, spectrum, audit } = result

  // Forecast envelope chart data â€” stacked-area band trick
  const forecastChartData = monthly_2025.map(m => ({
    month:      m.month,
    band_low:   m.p10,
    band_width: m.p90 - m.p10,
    p50:        m.p50,
    actual:     m.actual,
  }))

  // Historical context chart: training period + 2025 actual mean
  const annual2025Mean = Math.round(
    monthly_2025.reduce((s, m) => s + m.actual, 0) / 12,
  )
  const contextData = [
    ...annual_history,
    { year: 2025, mean_mwh: annual2025Mean },
  ]

  const residualData = monthly_2025.map(m => ({
    month:    m.month,
    residual: m.residual,
  }))

  const spectralData = spectrum.map(s => ({
    label:      s.label,
    Historical: s.historical,
    Forecast:   s.forecast,
    Actual:     s.actual,
  }))

  const coveragePct = Math.round(metrics.coverage_rate * 100)

  return (
    <div className="gp-grid">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="gp-page-header">
        <div>
          <h1 className="gp-page-title">Proofs</h1>
          <p className="gp-page-subtitle">
            Historical Holdout Proof: Forecast Envelope, Spectral Structure, Temporal Playback
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <StatusBadge label={`Training ${audit.training_period}`} color="slate" />
          <StatusBadge label={`Holdout ${audit.holdout_period}`}  color="purple" />
          <StatusBadge label={`N = ${audit.n_training}`}          color="slate" />
          <StatusBadge label={`N = ${audit.n_holdout}`}           color="blue"  />
        </div>
      </div>

      {/* â”€â”€ No-leakage marker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        fontSize: '0.78rem', fontFamily: 'monospace',
        padding: '0.45rem 0.75rem',
        background: 'var(--gp-slate-bg)',
        border: '1px solid var(--gp-border)',
        borderRadius: 'var(--gp-radius-sm)',
        color: 'var(--gp-text-secondary)',
      }}>
        leakage: none â€” forecast generated from 2000â€“2024 data only Â· 2025 actuals excluded from training Â· used for post-hoc validation only
      </div>

      {/* â”€â”€ Metric strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="gp-stat-grid">
        <StatCard
          label="Band Coverage"
          value={`${coveragePct}%`}
          sub="actual inside P10â€“P90"
          accent={coveragePct >= 90 ? 'var(--gp-green)' : coveragePct >= 75 ? 'var(--gp-amber)' : 'var(--gp-red)'}
        />
        <StatCard label="MAE"       value={`${metrics.mae.toLocaleString()} MWh`}  accent={BLUE} />
        <StatCard label="RMSE"      value={`${metrics.rmse.toLocaleString()} MWh`} accent={BLUE} />
        <StatCard label="MAPE"      value={`${metrics.mape}%`}                     accent="var(--gp-purple)" />
        <StatCard
          label="Bias"
          value={`${metrics.bias > 0 ? '+' : ''}${metrics.bias.toLocaleString()} MWh`}
          sub="mean residual"
          accent={Math.abs(metrics.bias) < 150 ? 'var(--gp-green)' : 'var(--gp-amber)'}
        />
        <StatCard label="Max Error" value={`${metrics.max_abs_error.toLocaleString()} MWh`} accent="var(--gp-red)" />
      </div>

      {/* â”€â”€ Forecast Envelope (hero) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <DashboardCard
        title="Forecast Envelope â€” 2025 Holdout"
        subtitle={`P10 / P50 / P90 vs observed series Â· holdout ${audit.holdout_period}`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={forecastChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
            <XAxis dataKey="month"  tick={{ fontSize: 11, fill: SLATE }} />
            <YAxis
              tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
              unit=" MWh"
              tick={{ fontSize: 11, fill: SLATE }}
            />
            <Tooltip content={<ForecastTooltip />} />
            {/* Stacked-area band: band_low is transparent floor, band_width is the visible fill */}
            <Area
              dataKey="band_low"  stackId="band"
              fillOpacity={0}     stroke="none"     legendType="none"
            />
            <Area
              dataKey="band_width" stackId="band"
              fill={BAND_FILL}    stroke={BAND_LINE}
              strokeWidth={1}     strokeDasharray="4 2"
              legendType="square" name="Forecast Band (P10â€“P90)"
            />
            <Line
              dataKey="p50"    stroke={BLUE}  strokeWidth={2}   dot={false}
              name="P50 Forecast"
            />
            <Line
              dataKey="actual" stroke={GREEN} strokeWidth={2.5}
              dot={{ r: 4, fill: GREEN, strokeWidth: 0 }}
              name="Observed Series"
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: SLATE }} />
          </ComposedChart>
        </ResponsiveContainer>
      </DashboardCard>

      {/* â”€â”€ Historical Context + Residual Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        <DashboardCard
          title="Training Window"
          subtitle="Annual mean generation 2000â€“2025 Â· 50 MW solar site"
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={contextData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: SLATE }} interval={4} />
              <YAxis
                tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
                tick={{ fontSize: 10, fill: SLATE }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [`${Math.round(v).toLocaleString()} MWh`, 'Annual mean']}
              />
              <Line dataKey="mean_mwh" stroke={BLUE} strokeWidth={1.5} dot={false} name="Annual Mean" />
              <ReferenceLine
                x={2025} stroke="var(--gp-purple)" strokeDasharray="4 2" strokeWidth={1.5}
                label={{ value: 'holdout', position: 'insideTopRight', fontSize: 9, fill: 'var(--gp-purple)' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </DashboardCard>

        <DashboardCard
          title="Residual Field â€” 2025"
          subtitle="Observed âˆ’ P50 forecast (MWh) Â· sign indicates over/under"
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={residualData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: SLATE }} />
              <YAxis tick={{ fontSize: 10, fill: SLATE }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [
                  `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()} MWh`, 'Residual',
                ]}
              />
              <ReferenceLine y={0} stroke="var(--gp-border)" strokeWidth={1.5} />
              <Bar dataKey="residual" radius={[3, 3, 0, 0]} name="Residual">
                {residualData.map((d, i) => (
                  <Cell key={i} fill={d.residual >= 0 ? GREEN : '#f87171'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </DashboardCard>

      </div>

      {/* â”€â”€ Spectral Agreement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <DashboardCard
        title="Spectral Agreement"
        subtitle={`Harmonic amplitude â€” ${audit.spectral_method} Â· historical / forecast / observed`}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={spectralData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gp-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: SLATE }} />
            <YAxis tick={{ fontSize: 11, fill: SLATE }} unit=" MWh" />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: SLATE }} />
            <Bar dataKey="Historical" fill={SLATE}       radius={[3, 3, 0, 0]} opacity={0.7} />
            <Bar dataKey="Forecast"   fill={BLUE}        radius={[3, 3, 0, 0]} opacity={0.85} />
            <Bar dataKey="Actual"     fill={GREEN}       radius={[3, 3, 0, 0]} opacity={0.9} />
          </BarChart>
        </ResponsiveContainer>
      </DashboardCard>

      {/* â”€â”€ Temporal Playback â€” Signature Helix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <DashboardCard
        title="Temporal Playback â€” Signature Helix"
        subtitle="365-day Ã— 24-hour deviation field Â· color: âˆ’3Ïƒ teal â†’ 0 green â†’ +3Ïƒ gold"
      >
        <HelixDisplay />
      </DashboardCard>

      {/* â”€â”€ Calibration Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <DashboardCard title="Calibration â€” Monthly Accuracy 2025">
        <table className="gp-table">
          <thead>
            <tr>
              <th>Month</th>
              <th style={{ textAlign: 'right' }}>P10</th>
              <th style={{ textAlign: 'right' }}>P50</th>
              <th style={{ textAlign: 'right' }}>P90</th>
              <th style={{ textAlign: 'right' }}>Observed</th>
              <th style={{ textAlign: 'right' }}>Residual</th>
              <th style={{ textAlign: 'right' }}>Err %</th>
              <th style={{ textAlign: 'center' }}>In Band</th>
            </tr>
          </thead>
          <tbody>
            {monthly_2025.map(m => {
              const errPct = ((m.residual / m.p50) * 100).toFixed(1)
              return (
                <tr key={m.month}>
                  <td style={{ fontWeight: 600 }}>{m.month}</td>
                  <td style={{ textAlign: 'right', color: 'var(--gp-text-muted)', fontSize: '0.8rem' }}>
                    {m.p10.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--gp-text-secondary)' }}>
                    {m.p50.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--gp-text-muted)', fontSize: '0.8rem' }}>
                    {m.p90.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {m.actual.toLocaleString()}
                  </td>
                  <td style={{
                    textAlign: 'right', fontWeight: 600,
                    color: m.residual >= 0 ? GREEN : '#f87171',
                  }}>
                    {m.residual > 0 ? '+' : ''}{m.residual.toLocaleString()}
                  </td>
                  <td style={{
                    textAlign: 'right',
                    color: Math.abs(Number(errPct)) > 10 ? '#ef4444' : 'var(--gp-text-secondary)',
                  }}>
                    {m.residual > 0 ? '+' : ''}{errPct}%
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge label={m.in_band ? 'in' : 'out'} color={m.in_band ? 'green' : 'red'} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </DashboardCard>

      {/* â”€â”€ Audit Metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <DashboardCard title="Audit Metadata">
        <table className="gp-table">
          <tbody>
            {(Object.entries(audit) as [string, string | number][]).map(([k, v]) => (
              <tr key={k}>
                <td style={{
                  fontFamily: 'monospace', fontSize: '0.78rem',
                  color: 'var(--gp-text-muted)', width: '220px', userSelect: 'all',
                }}>
                  {k}
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--gp-text-primary)' }}>
                  {String(v)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DashboardCard>

    </div>
  )
}
