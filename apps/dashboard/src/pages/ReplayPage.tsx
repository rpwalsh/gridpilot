/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts'
import AppShell from '../shell/AppShell'
import MetricCard from '../components/MetricCard'
import SourceRecordPanel from '../components/SourceRecordPanel'
import HeatmapChart from '../components/HeatmapChart'

// Generate realistic solar power data for 2 years
function generateSolarData() {
  const data = []
  const start = new Date('2019-01-01')
  const end = new Date('2020-12-31')
  
  for (let d = new Date(start); d <= end; d.setHours(d.getHours() + 1)) {
    const dayOfYear = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    const hourOfDay = d.getHours()
    
    // Simulate solar irradiance pattern (seasonal + daily)
    const seasonalFactor = Math.sin((dayOfYear / 365) * Math.PI)
    const dailyFactor = Math.max(0, Math.sin((hourOfDay / 24) * Math.PI - Math.PI / 2))
    const baseGHI = 400 * seasonalFactor * dailyFactor
    const noise = (Math.random() - 0.5) * 100
    const ghi = Math.max(0, baseGHI + noise)
    
    // Power correlates with irradiance
    const capacity = 1200 // kW
    const systemEfficiency = 0.85
    const actual = Math.max(0, (ghi / 1000) * capacity * systemEfficiency + (Math.random() - 0.5) * 50)
    
    // Model slightly smoother version
    const model = actual * 0.95 + Math.random() * 20
    
    data.push({
      timestamp: d.toISOString(),
      time: d.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
      actual: Math.round(actual),
      model: Math.round(model),
      ghi: Math.round(ghi),
      temp: 15 + 15 * Math.sin((dayOfYear / 365) * Math.PI * 2) + (Math.random() - 0.5) * 5,
      wind: Math.abs(Math.random() * 8),
      irradiance: Math.round(ghi),
      quality: 85 + Math.random() * 15,
    })
  }
  
  return data
}

const SOLAR_DATA = generateSolarData()

interface FrameData {
  actual: number
  model: number
  ghi: number
  temp: number
  wind: number
  irradiance: number
  quality: number
}

export default function ReplayPage() {
  const [selectedIndex, setSelectedIndex] = useState(Math.floor(SOLAR_DATA.length * 0.3))
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [isSeeking, setIsSeeking] = useState(false)
  const seekTrackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isPlaying) return

    const step = speed >= 4 ? 4 : speed >= 2 ? 2 : 1
    const tickMs = Math.max(50, Math.round(180 / speed))

    const interval = setInterval(() => {
      setSelectedIndex((prev) => {
        if (prev >= SOLAR_DATA.length - 1) {
          setIsPlaying(false)
          return SOLAR_DATA.length - 1
        }
        return Math.min(SOLAR_DATA.length - 1, prev + step)
      })
    }, tickMs)

    return () => clearInterval(interval)
  }, [isPlaying, speed])

  useEffect(() => {
    if (!isSeeking) return

    const onMove = (event: MouseEvent) => {
      const rect = seekTrackRef.current?.getBoundingClientRect()
      if (!rect) return
      const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      setSelectedIndex(Math.floor(percent * (SOLAR_DATA.length - 1)))
    }

    const onUp = () => setIsSeeking(false)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isSeeking])

  const currentFrame: FrameData = SOLAR_DATA[selectedIndex] || {
    actual: 642,
    model: 610,
    ghi: 812,
    temp: 28.3,
    wind: 3.6,
    irradiance: 812,
    quality: 98.7,
  }

  const currentTimestamp = SOLAR_DATA[selectedIndex]?.timestamp || '2019-07-19T12:45:00Z'

  // Generate heatmap data for 24-hour historical context
  const heatmapData = useMemo(() => {
    const hours = []
    for (let h = 0; h < 24; h++) {
      hours.push({
        hour: `${h.toString().padStart(2, '0')}:00`,
        value: Math.round(50 + Math.sin((h / 24) * Math.PI - Math.PI / 2) * 50),
      })
    }
    return hours
  }, [])

  const windowStart = Math.max(0, selectedIndex - 720)
  const windowEnd = Math.min(SOLAR_DATA.length, selectedIndex + 720)
  const contextData = SOLAR_DATA.slice(windowStart, windowEnd)

  const displayData = contextData
    .filter((_, i) => i % 8 === 0)
    .slice(0, 220)
    .map((d, i) => ({ ...d, idx: i }))

  const selectedVisibleIndex = Math.max(
    0,
    Math.min(
      displayData.length - 1,
      Math.round(
        ((selectedIndex - windowStart) / Math.max(1, windowEnd - windowStart - 1)) *
          Math.max(1, displayData.length - 1),
      ),
    ),
  )

  const summarize = (key: keyof FrameData) => {
    const values = contextData.map((d) => Number(d[key]))
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((acc, value) => acc + value, 0) / Math.max(1, values.length)
    return { min, max, avg }
  }

  const actualSummary = summarize('actual')
  const irradianceSummary = summarize('irradiance')
  const tempSummary = summarize('temp')
  const windSummary = summarize('wind')

  const handleSeekMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = seekTrackRef.current?.getBoundingClientRect()
    if (!rect) return
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    setSelectedIndex(Math.floor(percent * (SOLAR_DATA.length - 1)))
    setIsPlaying(false)
    setIsSeeking(true)
  }

  const getQualityColor = (q: number) => {
    if (q > 95) return '#64b5f6' // Good
    if (q > 85) return '#ffa726' // Fair
    return '#ff6b6b' // Poor
  }

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  return (
    <AppShell title="Replay">
      <div className="gp-replay-container">
        {/* Compact top control bar */}
        <div className="gp-replay-topbar-compact">
          <div className="gp-replay-control-group">
            <label>Dataset</label>
            <select className="gp-replay-select gp-replay-select-compact">
              <option>PVDAQ_SITE_001</option>
            </select>
          </div>
          <div className="gp-replay-control-group">
            <label>Metric</label>
            <select className="gp-replay-select gp-replay-select-compact">
              <option>AC_POWER</option>
            </select>
          </div>
          <div className="gp-replay-control-group">
            <label>Unit</label>
            <select className="gp-replay-select gp-replay-select-compact">
              <option>kW</option>
            </select>
          </div>
          <div className="gp-replay-control-group gp-replay-date-group">
            <input type="date" defaultValue="2019-01-01" className="gp-replay-input" />
            <span className="gp-replay-arrow"></span>
            <input type="date" defaultValue="2019-12-31" className="gp-replay-input" />
          </div>
          <button className="gp-replay-button gp-replay-button-refresh"></button>
        </div>

        {/* Main 2-column layout */}
        <div className="gp-replay-main-grid">
          {/* Left: Charts and metrics */}
          <div className="gp-replay-left-col">
            <div className="gp-panel gp-replay-chart-panel">

              <div className="gp-replay-chart-header">
                <h3 className="gp-replay-chart-title">AC Power (kW)  Replay</h3>
                <div className="gp-replay-playback-controls">
                  <div className="gp-replay-control-item">
                    <label>Speed</label>
                    <select
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="gp-replay-select gp-replay-select-compact"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                    </select>
                  </div>
                  <div className="gp-replay-playback-btns">
                    <button className="gp-replay-btn-icon gp-replay-btn-rewind" title="Rewind"></button>
                    <button 
                      className="gp-replay-btn-icon gp-replay-btn-play"
                      onClick={() => setIsPlaying((prev) => !prev)}
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? '' : ''}
                    </button>
                    <button className="gp-replay-btn-icon gp-replay-btn-forward" title="Forward"></button>
                  </div>
                  <div className="gp-replay-timestamp">{formatTime(currentTimestamp)} CDT</div>
                </div>
              </div>

              <div className="gp-replay-chart-main">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={displayData} margin={{ top: 5, right: 12, left: 40, bottom: 20 }}>
                    <defs>
                      <linearGradient id="replayActualGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#28bfff" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#28bfff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(80, 190, 255, 0.1)" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#91a8b8', fontSize: 12 }}
                      stroke="rgba(80, 190, 255, 0.12)"
                      interval={Math.max(0, Math.floor(displayData.length / 7))}
                    />
                    <YAxis tick={{ fill: '#91a8b8', fontSize: 12 }} stroke="rgba(80, 190, 255, 0.12)" />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#28bfff"
                      fill="url(#replayActualGradient)"
                      name="AC Power (kW)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="model"
                      stroke="rgba(180, 190, 200, 0.55)"
                      name="Expected (Model)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <ReferenceLine
                      x={selectedVisibleIndex}
                      stroke="rgba(90, 210, 255, 0.9)"
                      strokeWidth={2}
                      strokeOpacity={1}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Context scrubber */}
              <div className="gp-replay-scrubber">
                <div
                  ref={seekTrackRef}
                  className="gp-replay-scrubber-track"
                  onMouseDown={handleSeekMouseDown}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={SOLAR_DATA.length - 1}
                  aria-valuenow={selectedIndex}
                >
                  <svg viewBox={`0 0 100 30`} preserveAspectRatio="none" className="gp-replay-scrubber-waveform">
                    {displayData.map((point, i) => (
                      <line
                        key={i}
                        x1={`${(i / displayData.length) * 100}`}
                        y1={15}
                        x2={`${(i / displayData.length) * 100}`}
                        y2={Math.max(5, 15 - (point.actual / 1200) * 10)}
                        stroke="rgba(40, 191, 255, 0.4)"
                        strokeWidth="0.5"
                      />
                    ))}
                  </svg>
                  <div
                    className="gp-replay-scrubber-head"
                    style={{ left: `${(selectedIndex / Math.max(1, SOLAR_DATA.length - 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current values row */}
              <div className="gp-replay-values-row">
                {[
                  { icon: '', label: 'AC Power', value: currentFrame.actual.toFixed(1), unit: 'kW' },
                  { icon: '', label: 'Irradiance', value: currentFrame.irradiance.toFixed(1), unit: 'W/m' },
                  { icon: '', label: 'Ambient Temp', value: currentFrame.temp.toFixed(1), unit: 'C' },
                  { icon: '', label: 'Wind Speed', value: currentFrame.wind.toFixed(1), unit: 'm/s' },
                  { icon: '', label: 'Quality State', value: currentFrame.quality.toFixed(1), unit: '%', color: '#66d36e' },
                ].map((item) => (
                  <div key={item.label} className="gp-replay-value-card">
                    <div className="gp-replay-value-icon">{item.icon}</div>
                    <div className="gp-replay-value-label">{item.label}</div>
                    <div className="gp-replay-value-number" style={{ color: item.color || '#28bfff' }}>
                      {item.value}
                    </div>
                    <div className="gp-replay-value-unit">{item.unit}</div>
                  </div>
                ))}
              </div>

              {/* Heatmap */}
              <div className="gp-replay-heatmap-section">
                <div className="gp-replay-heatmap-label">HISTORICAL CONTEXT (AC POWER % OF NAMEPLATE)</div>
                <div className="gp-replay-heatmap-container">
                  {heatmapData.map((cell) => (
                    <div
                      key={cell.hour}
                      className="gp-replay-heatmap-cell-new"
                      style={{
                        background: `rgba(40, 191, 255, ${Math.max(0.15, cell.value / 120)})`,
                        border: `1px solid rgba(80, 190, 255, 0.3)`,
                      }}
                      title={`${cell.hour}: ${cell.value}%`}
                    >
                      <small>{cell.hour}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sidebar */}
          <aside className="gp-replay-sidebar-new">
            <div className="gp-replay-sidebar-section">
              <h4 className="gp-replay-sidebar-title">SOURCE RECORD</h4>
              <SourceRecordPanel
                provider="NREL PVDAQ"
                sourceType="PV System Performance"
                datasetId="pvdaq_site_001"
                siteName="AZ_Tucson_1MW"
                capturedAt={currentTimestamp}
                records={184201}
                startDate="2018-01-01 00:00:00Z"
                endDate="2020-12-31 23:59:59Z"
                cadence="5 minute"
                contentHash="a3f0...44d8b8f204"
                schemaVersion="dispatchlayer.schema.v1"
                quality={{ good: 98.7, missing: 0.9, stale: 0.4, other: 0.0 }}
              />
            </div>

            <div className="gp-replay-sidebar-section">
              <h4 className="gp-replay-sidebar-title">CURRENT FRAME SUMMARY</h4>
              <div className="gp-replay-frame-summary-table">
                <div className="gp-replay-summary-row">
                  <div className="gp-replay-summary-metric">Metric</div>
                  <div className="gp-replay-summary-val">Min</div>
                  <div className="gp-replay-summary-val">Max</div>
                  <div className="gp-replay-summary-val">Avg</div>
                </div>
                <div className="gp-replay-summary-row">
                  <div className="gp-replay-summary-metric">AC Power (kW)</div>
                  <div className="gp-replay-summary-val">{actualSummary.min.toFixed(1)}</div>
                  <div className="gp-replay-summary-val">{actualSummary.max.toFixed(1)}</div>
                  <div className="gp-replay-summary-val">{currentFrame.actual.toFixed(1)}</div>
                </div>
                <div className="gp-replay-summary-row">
                  <div className="gp-replay-summary-metric">POA Irradiance (W/m)</div>
                  <div className="gp-replay-summary-val">{irradianceSummary.min.toFixed(1)}</div>
                  <div className="gp-replay-summary-val">{irradianceSummary.max.toFixed(1)}</div>
                  <div className="gp-replay-summary-val" style={{ color: '#ffc933' }}>{currentFrame.irradiance.toFixed(1)}</div>
                </div>
                <div className="gp-replay-summary-row">
                  <div className="gp-replay-summary-metric">Ambient Temp (C)</div>
                  <div className="gp-replay-summary-val">{tempSummary.min.toFixed(1)}</div>
                  <div className="gp-replay-summary-val">{tempSummary.max.toFixed(1)}</div>
                  <div className="gp-replay-summary-val" style={{ color: '#ff7043' }}>{currentFrame.temp.toFixed(1)}</div>
                </div>
                <div className="gp-replay-summary-row">
                  <div className="gp-replay-summary-metric">Wind Speed (m/s)</div>
                  <div className="gp-replay-summary-val">{windSummary.min.toFixed(1)}</div>
                  <div className="gp-replay-summary-val">{windSummary.max.toFixed(1)}</div>
                  <div className="gp-replay-summary-val">{currentFrame.wind.toFixed(1)}</div>
                </div>
              </div>
            </div>

            <div className="gp-replay-sidebar-section">
              <h4 className="gp-replay-sidebar-title">DATA QUALITY (summary)</h4>
              <div className="gp-replay-quality-legend-new">
                <div style={{ color: '#66d36e' }}> Good 98.7%</div>
                <div style={{ color: '#ffc933' }}> Missing 0.9%</div>
                <div style={{ color: '#ff7043' }}> Stale 0.4%</div>
                <div style={{ color: '#5f7688' }}> Other 0.0%</div>
              </div>
            </div>
          </aside>
        </div>

        {/* Compact footer status bar */}
        <div className="gp-replay-footer-bar">
          <div className="gp-replay-status-cell">
            <span className="gp-replay-status-label">LOCAL TIME</span>
            <span className="gp-replay-status-value">{formatTime(currentTimestamp)}</span>
          </div>
          <div className="gp-replay-status-cell">
            <span className="gp-replay-status-label">TIMEZONE</span>
            <span className="gp-replay-status-value">America/Chicago</span>
          </div>
          <div className="gp-replay-status-cell">
            <span className="gp-replay-status-label">DATASET STATE</span>
            <span className="gp-replay-status-value" style={{ color: '#66d36e' }}>LOADED</span>
          </div>
          <div className="gp-replay-status-cell">
            <span className="gp-replay-status-label">ACTIVE SOURCE</span>
            <span className="gp-replay-status-value">PVDAQ_SITE_001</span>
          </div>
          <div className="gp-replay-status-cell">
            <span className="gp-replay-status-label">RECORDS</span>
            <span className="gp-replay-status-value">184,201</span>
          </div>
          <div className="gp-replay-status-cell">
            <span className="gp-replay-status-label">LAST UPDATED</span>
            <span className="gp-replay-status-value">2020-12-31 00:00:00Z</span>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

