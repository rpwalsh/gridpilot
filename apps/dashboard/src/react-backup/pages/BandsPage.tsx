/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useState, useMemo } from 'react'
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Box, Stack, Card, Typography } from '@mui/material'
import AppShell from '../shell/AppShell'

function generateForecastData() {
  const data = []
  const start = new Date('2019-01-01')
  for (let i = 0; i < 365; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const seasonalFactor = Math.sin((i / 365) * Math.PI)
    const p50 = 400 + seasonalFactor * 300
    const p10 = p50 * 0.7
    const p90 = p50 * 1.25
    const actual = p50 + (Math.random() - 0.5) * 200
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
      p10: Math.max(0, p10),
      p50: Math.max(0, p50),
      p90: Math.max(0, p90),
      actual: Math.max(0, actual),
      residual: actual - p50,
    })
  }
  return data
}

const FORECAST_DATA = generateForecastData()

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(7,16,32,0.95)',
    border: '1px solid rgba(121,203,255,0.42)',
    borderRadius: '8px',
    color: '#dff1ff',
  },
}

export default function BandsPage() {
  const [timeRange, setTimeRange] = useState('1M')

  const filteredData = useMemo(() => {
    const ranges: Record<string, number> = { '1H': 1, '1D': 24, '1W': 168, '1M': 744, '1Y': 8760 }
    const rangeSize = ranges[timeRange] || 744
    const step = Math.max(1, Math.floor(FORECAST_DATA.length / rangeSize))
    return FORECAST_DATA.filter((_, i) => i % step === 0).slice(-rangeSize)
  }, [timeRange])

  const metrics = [
    { label: 'Coverage', value: '90.6%' },
    { label: 'MAE (kW)', value: '78.3' },
    { label: 'RMSE (kW)', value: '112.7' },
    { label: 'Bias (kW)', value: '-6.2' },
  ]

  return (
    <AppShell title="Bands">
      <Stack direction="row" spacing={1.5} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

        <Stack direction="column" spacing={1.5} sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>

          <Card className="gp-card" sx={{ p: 1.5, flexShrink: 0 }}>
            <Stack direction="row" spacing={1}>
              {['1H', '1D', '1W', '1M'].map((range) => (
                <button key={range} onClick={() => setTimeRange(range)}
                  className={`gp-tab ${timeRange === range ? 'gp-tab--active' : ''}`}>{range}</button>
              ))}
            </Stack>
          </Card>

          <Card className="gp-card" sx={{ p: 1.5, flexGrow: 3, flexShrink: 1, flexBasis: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography variant="overline" sx={{ color: '#dff1ff', letterSpacing: 1, flexShrink: 0 }}>
              Forecast Bands (AC Power kW)
            </Typography>
            <Typography variant="caption" sx={{ color: '#5f7688', mb: 1, flexShrink: 0 }}>
              P10, P50, P90 envelope with actual overlay
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredData} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="bandP90" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#64b5f6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#64b5f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(121,203,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#7393ab', fontSize: 11 }} stroke="rgba(121,203,255,0.22)" />
                  <YAxis tick={{ fill: '#7393ab', fontSize: 11 }} stroke="rgba(121,203,255,0.22)" />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="p90" fill="url(#bandP90)" stroke="none" name="p90" isAnimationActive={false} />
                  <Area type="monotone" dataKey="p50" stroke="rgba(100,181,246,0.8)" fill="rgba(100,181,246,0.1)" name="p50 (Median)" isAnimationActive={false} />
                  <Line type="monotone" dataKey="p10" stroke="rgba(100,181,246,0.5)" name="p10" isAnimationActive={false} strokeWidth={1} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="actual" stroke="#ffa726" name="Actual" isAnimationActive={false} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Card>

          <Card className="gp-card" sx={{ p: 1.5, flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography variant="overline" sx={{ color: '#dff1ff', letterSpacing: 1, flexShrink: 0 }}>
              Residual (Actual - P50)
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredData} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(121,203,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#7393ab', fontSize: 11 }} stroke="rgba(121,203,255,0.22)" />
                  <YAxis tick={{ fill: '#7393ab', fontSize: 11 }} stroke="rgba(121,203,255,0.22)" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="residual" fill="#ffa726" name="Residual (kW)" radius={2} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Card>

        </Stack>

        <Stack direction="column" spacing={1.5} sx={{ width: 220, flexShrink: 0, overflow: 'auto' }}>

          <Card className="gp-card" sx={{ p: 1.5 }}>
            <Typography variant="overline" sx={{ color: '#dff1ff', letterSpacing: 1 }}>Performance</Typography>
            {metrics.map((m) => (
              <Stack key={m.label} direction="row" sx={{ mt: 0.75, justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#5f7688' }}>{m.label}</Typography>
                <Typography variant="caption" sx={{ color: '#e6f4ff', fontWeight: 700 }}>{m.value}</Typography>
              </Stack>
            ))}
          </Card>

          <Card className="gp-card" sx={{ p: 1.5 }}>
            <Typography variant="overline" sx={{ color: '#dff1ff', letterSpacing: 1 }}>Band State</Typography>
            <Typography sx={{ color: '#66bb6a', fontWeight: 800, fontSize: '1.1rem', mt: 0.5 }}>GOOD</Typography>
            <Typography variant="caption" sx={{ color: '#5f7688' }}>Within Targets</Typography>
          </Card>

          <Card className="gp-card" sx={{ p: 1.5 }}>
            <Typography variant="overline" sx={{ color: '#dff1ff', letterSpacing: 1 }}>Configuration</Typography>
            {[
              { label: 'Training', value: '2018' },
              { label: 'Holdout', value: '2019' },
              { label: 'Horizon', value: '24 h' },
            ].map((item) => (
              <Stack key={item.label} direction="row" sx={{ mt: 0.75, justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#5f7688' }}>{item.label}</Typography>
                <Typography variant="caption" sx={{ color: '#e6f4ff', fontWeight: 700 }}>{item.value}</Typography>
              </Stack>
            ))}
          </Card>

          <Card className="gp-card" sx={{ p: 1.5 }}>
            <Typography variant="overline" sx={{ color: '#dff1ff', letterSpacing: 1 }}>Quantiles</Typography>
            <Typography sx={{ color: '#28bfff', fontWeight: 800, fontSize: '1rem', mt: 0.5 }}>200 / 400 / 550</Typography>
            <Typography variant="caption" sx={{ color: '#5f7688' }}>P10 / P50 / P90</Typography>
          </Card>

        </Stack>
      </Stack>
    </AppShell>
  )
}
