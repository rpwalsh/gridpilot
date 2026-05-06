/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useMemo } from 'react'

interface HeatmapChartProps {
  data?: Array<{ hour: string; value: number }>
  title?: string
  height?: number
}

export default function HeatmapChart({ 
  data, 
  title = 'HISTORICAL CONTEXT (AC POWER % OF NAMEPLATE)',
  height = 140 
}: HeatmapChartProps) {
  // Default data if not provided
  const chartData = useMemo(() => {
    if (data) return data
    
    const hours = []
    for (let h = 0; h < 24; h++) {
      hours.push({
        hour: `${h.toString().padStart(2, '0')}:00`,
        value: Math.round(50 + Math.sin((h / 24) * Math.PI - Math.PI / 2) * 50),
      })
    }
    return hours
  }, [data])

  const getColor = (value: number) => {
    if (value < 10) return '#0a0f20'
    if (value < 25) return '#1a2847'
    if (value < 50) return '#2a4d7f'
    if (value < 75) return '#4a73b8'
    if (value < 90) return '#64a5f0'
    return '#90caf9'
  }

  return (
    <div className="heatmap-chart">
      <div className="heatmap-chart__header">
        <h4 className="heatmap-chart__title">{title}</h4>
      </div>
      <div className="heatmap-chart__container" style={{ height }}>
        <div className="heatmap-chart__grid">
          {chartData.map((item, idx) => (
            <div key={idx} className="heatmap-chart__cell-wrapper">
              <div
                className="heatmap-chart__cell"
                style={{ backgroundColor: getColor(item.value) }}
                title={`${item.hour}: ${item.value}%`}
              />
              <div className="heatmap-chart__label">{item.hour}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-chart__legend">
        <div className="heatmap-chart__legend-item">
          <div style={{ width: '12px', height: '12px', backgroundColor: '#0a0f20', borderRadius: '2px' }} />
          <span>0%</span>
        </div>
        <div className="heatmap-chart__legend-item">
          <div style={{ width: '12px', height: '12px', backgroundColor: '#4a73b8', borderRadius: '2px' }} />
          <span>50%</span>
        </div>
        <div className="heatmap-chart__legend-item">
          <div style={{ width: '12px', height: '12px', backgroundColor: '#90caf9', borderRadius: '2px' }} />
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}
