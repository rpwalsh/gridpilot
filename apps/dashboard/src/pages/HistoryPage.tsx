/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useState, useMemo, useEffect } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  ScatterChart,
} from 'recharts'
import AppShell from '../shell/AppShell'

function generateHistoricalData() {
  const data = []
  const start = new Date('2019-01-01')
  
  for (let i = 0; i < 365; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dayOfYear = i
    const seasonalFactor = Math.sin((dayOfYear / 365) * Math.PI)
    const dailyPattern = Math.sin(((dayOfYear % 30) / 30) * Math.PI * 2)
    
    const power = 400 + seasonalFactor * 300 + dailyPattern * 150 + Math.random() * 100
    const irradiance = 500 + seasonalFactor * 300 + dailyPattern * 200
    const temp = 15 + seasonalFactor * 15 + Math.random() * 5
    const wind = 3 + Math.sin((dayOfYear / 365) * Math.PI) * 2 + Math.random() * 2
    
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: d.toISOString(),
      power: Math.round(Math.max(0, power)),
      irradiance: Math.round(Math.max(0, irradiance)),
      temperature: temp.toFixed(1),
      wind: wind.toFixed(1),
      quality: 85 + Math.random() * 15,
    })
  }
  
  return data
}

const HISTORICAL_DATA = generateHistoricalData()

export default function HistoryPage() {
  const [dateStart, setDateStart] = useState('2019-01-01')
  const [dateEnd, setDateEnd] = useState('2019-12-31')
  const [metric, setMetric] = useState('power')
  const [overlayMetric, setOverlayMetric] = useState('temperature')

  const [statsKey, setStatsKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStatsKey((k) => k + 1)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const filteredData = useMemo(() => {
    const start = new Date(dateStart).getTime()
    const end = new Date(dateEnd).getTime()
    
    return HISTORICAL_DATA.filter((d) => {
      const t = new Date(d.timestamp).getTime()
      return t >= start && t <= end
    })
  }, [dateStart, dateEnd])

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avg: 0, min: 0, max: 0 }
    
    const values = filteredData.map((d) => {
      if (metric === 'power') return parseFloat(d.power.toString())
      if (metric === 'irradiance') return parseFloat(d.irradiance.toString())
      if (metric === 'temperature') return parseFloat(d.temperature)
      return parseFloat(d.wind)
    })
    
    return {
      avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
      min: Math.min(...values).toFixed(1),
      max: Math.max(...values).toFixed(1),
    }
  }, [filteredData, metric])

  const metricLabel = {
    power: 'AC Power (kW)',
    irradiance: 'Irradiance (W/mÂ²)',
    temperature: 'Temperature (Â°C)',
    wind: 'Wind Speed (m/s)',
  }

  return (
    <AppShell title="History">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', height: '100%' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
          {/* Date & Metric Selector */}
          <div className="gp-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px', gap: '12px', padding: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#707070', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(100,181,246,0.3)',
                  color: '#f5f5f5',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#707070', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                End Date
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(100,181,246,0.3)',
                  color: '#f5f5f5',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#707070', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                Metric
              </label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(100,181,246,0.3)',
                  color: '#f5f5f5',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                }}
              >
                <option value="power">Power</option>
                <option value="irradiance">Irradiance</option>
                <option value="temperature">Temperature</option>
                <option value="wind">Wind Speed</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#707070', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                Overlay
              </label>
              <select
                value={overlayMetric}
                onChange={(e) => setOverlayMetric(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(100,181,246,0.3)',
                  color: '#f5f5f5',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                }}
              >
                <option value="temperature">Temperature</option>
                <option value="wind">Wind Speed</option>
                <option value="irradiance">Irradiance</option>
                <option value="power">Power</option>
              </select>
            </div>
          </div>

          {/* Main Time Series Chart */}
          <div className="gp-panel" style={{ flex: 1, minHeight: '350px' }}>
            <h3 style={{ margin: '12px 0 12px 0', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {metricLabel[metric as keyof typeof metricLabel]} â€” Historical Trend
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart data={filteredData} margin={{ top: 10, right: 40, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64b5f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#64b5f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#707070', fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#707070', fontSize: 11 }}
                  stroke="rgba(255,255,255,0.1)"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#707070', fontSize: 11 }}
                  stroke="rgba(255,255,255,0.1)"
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,15,15,0.95)',
                    border: '1px solid rgba(100,181,246,0.3)',
                    borderRadius: '4px',
                    color: '#f5f5f5',
                  }}
                  labelStyle={{ color: '#f5f5f5' }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey={metric as any}
                  stroke="#64b5f6"
                  fill="url(#historyGradient)"
                  name={metricLabel[metric as keyof typeof metricLabel]}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={overlayMetric as any}
                  stroke="#ffa726"
                  name={metricLabel[overlayMetric as keyof typeof metricLabel]}
                  isAnimationActive={false}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution / Scatter */}
          <div className="gp-panel" style={{ flex: 0.6, minHeight: '250px' }}>
            <h3 style={{ margin: '12px 0 12px 0', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {metricLabel[metric as keyof typeof metricLabel]} vs {metricLabel[overlayMetric as keyof typeof metricLabel]} Correlation
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey={metric}
                  tick={{ fill: '#707070', fontSize: 11 }}
                  stroke="rgba(255,255,255,0.1)"
                  name={metricLabel[metric as keyof typeof metricLabel]}
                />
                <YAxis
                  dataKey={overlayMetric}
                  tick={{ fill: '#707070', fontSize: 11 }}
                  stroke="rgba(255,255,255,0.1)"
                  name={metricLabel[overlayMetric as keyof typeof metricLabel]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,15,15,0.95)',
                    border: '1px solid rgba(100,181,246,0.3)',
                    borderRadius: '4px',
                  }}
                  cursor={{ fill: 'rgba(100,181,246,0.1)' }}
                />
                <Scatter name={metricLabel[metric as keyof typeof metricLabel]} data={filteredData} fill="#64b5f6" isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' }}>
          {/* Statistics */}
          <div className="gp-panel" style={{ padding: '12px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#707070' }}>
              Statistics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Average', value: stats.avg, metric: metric },
                { label: 'Minimum', value: stats.min, metric: metric },
                { label: 'Maximum', value: stats.max, metric: metric },
                { label: 'Data Points', value: filteredData.length.toString(), metric: 'count' },
              ].map((s, idx) => (
                <div key={idx} className="gp-panel" style={{ padding: '8px', borderColor: 'rgba(100,181,246,0.3)', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(100,181,246,0.6)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0)'; e.currentTarget.style.borderColor = 'rgba(100,181,246,0.3)' }}>
                  <div style={{ fontSize: '10px', color: '#707070' }}>{s.label}</div>
                  <div style={{ fontFamily: 'Menlo, monospace', fontSize: '16px', fontWeight: 700, color: '#64b5f6', marginTop: '4px' }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Period Info */}
          <div className="gp-panel" style={{ padding: '12px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#707070' }}>
              Period
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              {[
                { label: 'Start', value: dateStart },
                { label: 'End', value: dateEnd },
                { label: 'Duration', value: `${filteredData.length} days` },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '8px' }}>
                  <span style={{ color: '#707070' }}>{item.label}</span>
                  <span style={{ fontFamily: 'Menlo, monospace', color: '#f5f5f5' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="gp-panel" style={{ padding: '12px' }}>
            <button
              style={{
                width: '100%',
                background: 'rgba(100,181,246,0.2)',
                border: '1px solid rgba(100,181,246,0.6)',
                color: '#64b5f6',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s',
                marginBottom: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(100,181,246,0.3)'
                e.currentTarget.style.borderColor = 'rgba(100,181,246,0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(100,181,246,0.2)'
                e.currentTarget.style.borderColor = 'rgba(100,181,246,0.6)'
              }}
            >
              â†“ Export Data
            </button>
            <button
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#707070',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = '#707070'
              }}
            >
              ðŸ“Š Generate Report
            </button>
          </div>

          {/* Data Quality Badge */}
          <div className="gp-panel" style={{ padding: '12px', background: 'rgba(100,181,246,0.1)', borderColor: 'rgba(100,181,246,0.4)' }}>
            <div style={{ fontSize: '11px', color: '#707070', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Data Quality
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#64b5f6' }} />
              <span style={{ fontSize: '12px', color: '#f5f5f5', fontWeight: 600 }}>Good</span>
              <span style={{ fontSize: '10px', color: '#707070', marginLeft: 'auto' }}>92.5%</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
