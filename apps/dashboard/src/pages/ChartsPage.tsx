import { useState, useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Scatter, ScatterChart } from 'recharts'
import AppShell from '../shell/AppShell'
import { Card } from '@mui/material'

const generateSolarData = () => {
  const data = []
  for (let i = 0; i < 365; i++) {
    const d = new Date('2024-01-01')
    d.setDate(d.getDate() + i)
    const seasonalFactor = Math.sin((i / 365) * Math.PI)
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      generation: 150 + seasonalFactor * 100 + Math.random() * 50,
      efficiency: 18 + Math.random() * 2,
      irradiance: 500 + seasonalFactor * 300,
      temp: 25 + seasonalFactor * 15,
      capacity: 200,
    })
  }
  return data
}

const generateWindData = () => {
  const data = []
  for (let i = 0; i < 365; i++) {
    const d = new Date('2024-01-01')
    d.setDate(d.getDate() + i)
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      generation: Math.abs(Math.sin(i * 0.017) * 150 + Math.random() * 80),
      efficiency: 35 + Math.random() * 5,
      windSpeed: 8 + Math.sin(i * 0.01) * 4 + Math.random() * 2,
      capacity: 400,
    })
  }
  return data
}

const generateMonthlyComparison = () => {
  return [
    { month: 'Jan', solar: 120, wind: 280, hydro: 200, thermal: 450 },
    { month: 'Feb', solar: 140, wind: 260, hydro: 210, thermal: 440 },
    { month: 'Mar', solar: 180, wind: 240, hydro: 220, thermal: 430 },
    { month: 'Apr', solar: 220, wind: 200, hydro: 230, thermal: 400 },
    { month: 'May', solar: 260, wind: 180, hydro: 240, thermal: 380 },
    { month: 'Jun', solar: 280, wind: 160, hydro: 250, thermal: 370 },
    { month: 'Jul', solar: 290, wind: 150, hydro: 245, thermal: 360 },
    { month: 'Aug', solar: 270, wind: 170, hydro: 240, thermal: 370 },
    { month: 'Sep', solar: 230, wind: 190, hydro: 230, thermal: 390 },
    { month: 'Oct', solar: 180, wind: 220, hydro: 220, thermal: 410 },
    { month: 'Nov', solar: 130, wind: 250, hydro: 210, thermal: 430 },
    { month: 'Dec', solar: 100, wind: 290, hydro: 200, thermal: 450 },
  ]
}

export default function ChartsPage() {
  const [selectedChart, setSelectedChart] = useState('solar-generation')
  const solarData = useMemo(() => generateSolarData(), [])
  const windData = useMemo(() => generateWindData(), [])
  const monthlyData = useMemo(() => generateMonthlyComparison(), [])

  const chartCategories = {
    'Solar': [
      { id: 'solar-generation', name: 'Daily Generation Trend' },
      { id: 'solar-efficiency', name: 'Panel Efficiency' },
      { id: 'solar-temp', name: 'Temperature Impact' },
      { id: 'solar-irradiance', name: 'Irradiance Distribution' },
      { id: 'solar-capacity', name: 'Capacity Factor' },
    ],
    'Wind': [
      { id: 'wind-generation', name: 'Daily Generation Trend' },
      { id: 'wind-efficiency', name: 'Turbine Efficiency' },
      { id: 'wind-speed', name: 'Wind Speed Correlation' },
      { id: 'wind-distribution', name: 'Power Distribution' },
      { id: 'wind-capacity', name: 'Capacity Factor' },
    ],
    'Portfolio': [
      { id: 'portfolio-mix', name: 'Monthly Generation Mix' },
      { id: 'portfolio-comparison', name: 'Source Comparison' },
      { id: 'portfolio-pie', name: 'Energy Mix %' },
      { id: 'portfolio-scatter', name: 'Efficiency vs Capacity' },
      { id: 'portfolio-stacked', name: 'Stacked Generation' },
    ],
  }

  const renderChart = () => {
    const commonProps = {
      width: '100%',
      height: 300,
      margin: { top: 5, right: 30, left: 0, bottom: 5 },
    }

    switch (selectedChart) {
      case 'solar-generation':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={solarData}>
              <defs>
                <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#28bfff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#28bfff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #28bfff' }} />
              <Area type="monotone" dataKey="generation" stroke="#28bfff" fill="url(#solarGrad)" name="Generation (MW)" />
            </AreaChart>
          </ResponsiveContainer>
        )
      case 'solar-efficiency':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={solarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #ffc933' }} />
              <Line type="monotone" dataKey="efficiency" stroke="#ffc933" name="Efficiency (%)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )
      case 'solar-temp':
        return (
          <ResponsiveContainer {...commonProps}>
            <ComposedChart data={solarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #ffc933' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="generation" fill="rgba(40,191,255,0.45)" name="Generation (MW)" />
              <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#ff7043" name="Temperature (C)" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )
      case 'solar-irradiance':
        return (
          <ResponsiveContainer {...commonProps}>
            <ComposedChart data={solarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #28bfff' }} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="irradiance" stroke="#ffc933" fill="rgba(255,201,51,0.2)" name="Irradiance (W/m2)" />
              <Line yAxisId="right" type="monotone" dataKey="generation" stroke="#28bfff" name="Generation (MW)" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )
      case 'solar-capacity':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart
              data={solarData.map((row) => ({
                date: row.date,
                capacityFactor: (row.generation / row.capacity) * 100,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#91a8b8' }} unit="%" />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #28bfff' }} />
              <Line type="monotone" dataKey="capacityFactor" stroke="#28bfff" name="Capacity Factor (%)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )
      case 'wind-generation':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={windData}>
              <defs>
                <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#66d36e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#66d36e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #66d36e' }} />
              <Area type="monotone" dataKey="generation" stroke="#66d36e" fill="url(#windGrad)" name="Generation (MW)" />
            </AreaChart>
          </ResponsiveContainer>
        )
      case 'wind-speed':
        return (
          <ResponsiveContainer {...commonProps}>
            <ComposedChart data={windData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #66d36e' }} />
              <Line yAxisId="left" type="monotone" dataKey="generation" stroke="#66d36e" name="Generation (MW)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="windSpeed" stroke="#ff7043" name="Wind Speed (m/s)" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )
      case 'wind-efficiency':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={windData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#91a8b8' }} unit="%" />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #66d36e' }} />
              <Line type="monotone" dataKey="efficiency" stroke="#66d36e" name="Efficiency (%)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )
      case 'wind-distribution':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart
              data={windData
                .filter((_, i) => i % 15 === 0)
                .map((row) => ({
                  date: row.date,
                  low: row.generation * 0.65,
                  mid: row.generation * 0.25,
                  peak: row.generation * 0.1,
                }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #66d36e' }} />
              <Legend />
              <Bar dataKey="low" stackId="dist" fill="rgba(102,211,110,0.5)" name="Baseload" />
              <Bar dataKey="mid" stackId="dist" fill="rgba(102,211,110,0.75)" name="Variable" />
              <Bar dataKey="peak" stackId="dist" fill="#66d36e" name="Peaking" />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'wind-capacity':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart
              data={windData.map((row) => ({
                date: row.date,
                capacityFactor: (row.generation / row.capacity) * 100,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#91a8b8' }} unit="%" />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #66d36e' }} />
              <Line type="monotone" dataKey="capacityFactor" stroke="#66d36e" name="Capacity Factor (%)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )
      case 'portfolio-mix':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #28bfff' }} />
              <Legend />
              <Bar dataKey="solar" stackId="a" fill="#28bfff" />
              <Bar dataKey="wind" stackId="a" fill="#66d36e" />
              <Bar dataKey="hydro" stackId="a" fill="#4dd0e1" />
              <Bar dataKey="thermal" stackId="a" fill="#ff7043" />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'portfolio-pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie dataKey="value" data={[
                { name: 'Solar', value: 2100 },
                { name: 'Wind', value: 2340 },
                { name: 'Hydro', value: 2670 },
                { name: 'Thermal', value: 4890 },
              ]} cx="50%" cy="50%" outerRadius={80} label>
                <Cell fill="#28bfff" />
                <Cell fill="#66d36e" />
                <Cell fill="#4dd0e1" />
                <Cell fill="#ff7043" />
              </Pie>
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #28bfff' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )
      case 'portfolio-comparison':
        return (
          <ResponsiveContainer {...commonProps}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #28bfff' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="solar" fill="#28bfff" name="Solar" />
              <Bar yAxisId="left" dataKey="wind" fill="#66d36e" name="Wind" />
              <Line yAxisId="right" type="monotone" dataKey="thermal" stroke="#ff7043" strokeWidth={2} name="Thermal" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )
      case 'portfolio-scatter':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart margin={commonProps.margin}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" dataKey="capacity" name="Capacity" unit=" MW" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis type="number" dataKey="efficiency" name="Efficiency" unit=" %" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#0a1628', border: '1px solid #28bfff' }} />
              <Legend />
              <Scatter
                name="Solar"
                data={solarData.filter((_, i) => i % 30 === 0).map((row) => ({ capacity: row.capacity, efficiency: row.efficiency }))}
                fill="#28bfff"
              />
              <Scatter
                name="Wind"
                data={windData.filter((_, i) => i % 30 === 0).map((row) => ({ capacity: row.capacity, efficiency: row.efficiency }))}
                fill="#66d36e"
              />
            </ScatterChart>
          </ResponsiveContainer>
        )
      case 'portfolio-stacked':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#91a8b8' }} />
              <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #28bfff' }} />
              <Legend />
              <Area type="monotone" dataKey="solar" stackId="1" stroke="#28bfff" fill="rgba(40,191,255,0.5)" />
              <Area type="monotone" dataKey="wind" stackId="1" stroke="#66d36e" fill="rgba(102,211,110,0.5)" />
              <Area type="monotone" dataKey="hydro" stackId="1" stroke="#4dd0e1" fill="rgba(77,208,225,0.5)" />
              <Area type="monotone" dataKey="thermal" stackId="1" stroke="#ff7043" fill="rgba(255,112,67,0.5)" />
            </AreaChart>
          </ResponsiveContainer>
        )
      default:
        return <div style={{ color: '#91a8b8' }}>Chart not implemented</div>
    }
  }

  return (
    <AppShell title="Analytics">
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '12px', height: '100%' }}>
        <Card className="gp-card" sx={{ p: 1.5, overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.75rem', fontWeight: 700, color: '#91a8b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Charts</h3>
          {Object.entries(chartCategories).map(([category, charts]) => (
            <div key={category} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#5f7688', textTransform: 'uppercase', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(96,190,255,0.15)' }}>
                {category}
              </div>
              {charts.map((chart) => (
                <button
                  key={chart.id}
                  onClick={() => setSelectedChart(chart.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    margin: '0.25rem 0',
                    background: selectedChart === chart.id ? 'rgba(40,191,255,0.2)' : 'transparent',
                    border: '1px solid ' + (selectedChart === chart.id ? 'rgba(40,191,255,0.6)' : 'transparent'),
                    color: selectedChart === chart.id ? '#28bfff' : '#91a8b8',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: selectedChart === chart.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (selectedChart !== chart.id) { e.currentTarget.style.background = 'rgba(40,191,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(40,191,255,0.3)' } }}
                  onMouseLeave={(e) => { if (selectedChart !== chart.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' } }}
                >
                  {chart.name}
                </button>
              ))}
            </div>
          ))}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' }}>
          <Card className="gp-card" sx={{ p: 1.5 }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: 700, color: '#e6f4ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {Object.values(chartCategories).flat().find(c => c.id === selectedChart)?.name || 'Chart'}
            </h2>
            <div style={{ height: '350px' }}>
              {renderChart()}
            </div>
          </Card>

          <Card className="gp-card" sx={{ p: 1.5 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.75rem', fontWeight: 700, color: '#91a8b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Summary Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'Avg Generation', value: '245 MW', unit: '' },
                { label: 'Peak Output', value: '389 MW', unit: '' },
                { label: 'Capacity Factor', value: '34.2%', unit: '' },
                { label: 'Uptime', value: '99.8%', unit: '' },
              ].map((stat, i) => (
                <div key={i} style={{ padding: '12px', background: 'rgba(40,191,255,0.08)', border: '1px solid rgba(40,191,255,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#5f7688', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{stat.label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#28bfff' }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
