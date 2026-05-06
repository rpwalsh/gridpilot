/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

/**
 * TelemetryDashboard page
 *
 * SCADA fleet snapshot â€” shows normalised AssetTelemetrySnapshot for each asset
 * using IEC 61400-25 signal names for wind and IEC 61724-1 for solar.
 *
 * data_mode=source  â†’ source-backed snapshots from data/source_snapshots
 * data_mode=live    â†’ most recent ingested snapshots from POST /telemetry/ingest
 *
 * Hardware telemetry is the operational truth layer.  Public APIs tell the
 * system what should happen; hardware telemetry tells it what actually happened.
 * The product becomes valuable when it reconciles those two and ranks causes.
 *
 * Public repo honesty: real SCADA and asset telemetry are customer-owned. The
 * production architecture is designed to connect
 * to SCADA historians, edge gateways, MQTT streams, OPC UA servers, Modbus
 * gateways, CSV/Parquet exports, and REST webhooks.
 */
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import axios from 'axios'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AssetSnapshot {
  asset_id: string
  site_id: string
  asset_type: string
  capacity_kw: number
  power_kw?: number
  expected_power_kw?: number
  availability_pct?: number
  wind_speed_mps?: number
  rotor_rpm?: number
  yaw_error_deg?: number
  blade_pitch_deg?: number
  gearbox_temperature_c?: number
  generator_temperature_c?: number
  vibration_mm_s?: number
  dc_voltage_v?: number
  dc_current_a?: number
  ac_power_kw?: number
  inverter_efficiency_pct?: number
  state_of_charge_pct?: number
  state_of_health_pct?: number
  discharge_power_kw?: number
  charge_power_kw?: number
  cell_temperature_c?: number
  pack_voltage_v?: number
  cycle_count?: number
  thermal_derate_flag?: boolean
  inverter_status?: string
  temperature_c?: number
  fault_code?: string
  quality_score?: number
  data_source?: string
  _anomaly_notes?: any
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function utilPct(snap: AssetSnapshot): number | null {
  if (snap.power_kw == null || snap.capacity_kw == null || snap.capacity_kw === 0) return null
  return Math.round((snap.power_kw / snap.capacity_kw) * 100)
}

function residualPct(snap: AssetSnapshot): number | null {
  if (snap.power_kw == null || !snap.expected_power_kw || snap.expected_power_kw === 0) return null
  return Math.round(((snap.power_kw - snap.expected_power_kw) / snap.expected_power_kw) * 100)
}

function assetLabel(snap: AssetSnapshot): string {
  return snap.asset_id.replace(/-/g, ' ')
}

function assetTypeLabel(t: string): string {
  return { wind_turbine: 'Wind Turbine', solar_inverter: 'Solar Inverter', bess: 'BESS' }[t] ?? t
}

function healthColor(score: number): string {
  if (score >= 0.95) return 'var(--gp-green)'
  if (score >= 0.80) return 'var(--gp-amber)'
  return 'var(--gp-red)'
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function WindTurbineCard({ snap }: { snap: AssetSnapshot }) {
  const res = residualPct(snap)
  const anomaly = res != null && res < -10

  const radarData = [
    { signal: 'Output', value: Math.min(Math.max((snap.power_kw ?? 0) / (snap.expected_power_kw ?? 1) * 100, 0), 100) },
    { signal: 'Availability', value: snap.availability_pct ?? 0 },
    { signal: 'Quality', value: (snap.quality_score ?? 1) * 100 },
    { signal: 'Rotor RPM', value: snap.rotor_rpm != null ? Math.min((snap.rotor_rpm / 14) * 100, 100) : 0 },
    { signal: 'Yaw OK', value: snap.yaw_error_deg != null ? Math.max(100 - Math.abs(snap.yaw_error_deg) * 5, 0) : 100 },
  ]

  return (
    <DashboardCard title={assetLabel(snap)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)', marginBottom: 2 }}>
            {assetTypeLabel(snap.asset_type)} Â· {snap.site_id}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gp-text-primary)' }}>
            {snap.power_kw?.toLocaleString() ?? 'â€”'}&thinsp;
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--gp-text-muted)' }}>kW</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)' }}>
            of {snap.capacity_kw?.toLocaleString()} kW Â· expected {snap.expected_power_kw?.toLocaleString()} kW
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <StatusBadge
            label={anomaly ? 'anomaly' : 'healthy'}
            color={anomaly ? 'red' : 'green'}
          />
          {res != null && (
            <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: 4,
              color: res < -10 ? 'var(--gp-red-text)' : 'var(--gp-green-text)' }}>
              {res > 0 ? '+' : ''}{res}% vs expected
            </div>
          )}
        </div>
      </div>

      {/* Radar health chart */}
      <ResponsiveContainer width="100%" height={140}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="var(--gp-border)" />
          <PolarAngleAxis dataKey="signal" tick={{ fontSize: 10, fill: 'var(--gp-text-muted)' }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke={anomaly ? 'var(--gp-red)' : 'var(--gp-blue)'} fill={anomaly ? 'var(--gp-red)' : 'var(--gp-blue)'} fillOpacity={0.25} />
        </RadarChart>
      </ResponsiveContainer>

      {/* SCADA signals (IEC 61400-25) */}
      <div className="gp-signal-grid">
        {[
          { label: 'Wind (hub) m/s', value: snap.wind_speed_mps },
          { label: 'Rotor RPM', value: snap.rotor_rpm },
          { label: 'Yaw error Â°', value: snap.yaw_error_deg, alarm: Math.abs(snap.yaw_error_deg ?? 0) > 5 },
          { label: 'Pitch Â°', value: snap.blade_pitch_deg, alarm: (snap.blade_pitch_deg ?? 0) > 10 },
          { label: 'Gearbox Â°C', value: snap.gearbox_temperature_c, alarm: (snap.gearbox_temperature_c ?? 0) > 70 },
          { label: 'Gen Â°C', value: snap.generator_temperature_c, alarm: (snap.generator_temperature_c ?? 0) > 80 },
          { label: 'Vibration mm/s', value: snap.vibration_mm_s, alarm: (snap.vibration_mm_s ?? 0) > 3 },
          { label: 'Avail %', value: snap.availability_pct },
        ].map(({ label, value, alarm }) => (
          <div key={label} className="gp-signal-kv" style={alarm ? { color: 'var(--gp-red-text)' } : {}}>
            <span className="gp-signal-kv__key">{label}</span>
            <span className="gp-signal-kv__val" style={{ fontWeight: alarm ? 800 : 600 }}>
              {value != null ? value.toFixed(1) : 'â€”'}
            </span>
          </div>
        ))}
      </div>

      {snap.fault_code && (
        <div className="gp-callout gp-callout--danger" style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
          Fault: <code>{snap.fault_code}</code>
        </div>
      )}

      {snap._anomaly_notes?.root_cause_ranking && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gp-text-secondary)', marginBottom: '0.35rem' }}>
            Root-cause ranking
          </div>
          {snap._anomaly_notes.root_cause_ranking.map((rc: any, i: number) => (
            <div key={i} style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                <span style={{ fontWeight: 600 }}>{rc.cause.replace(/_/g, ' ')}</span>
                <span style={{ fontWeight: 700 }}>{Math.round(rc.confidence * 100)}%</span>
              </div>
              <div className="gp-progress" style={{ marginBottom: 3 }}>
                <div className="gp-progress__bar" style={{
                  width: `${Math.round(rc.confidence * 100)}%`,
                  background: i === 0 ? 'var(--gp-red)' : 'var(--gp-amber)',
                }} />
              </div>
              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.73rem', color: 'var(--gp-text-muted)' }}>
                {rc.evidence.map((e: string, j: number) => <li key={j}>{e}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  )
}

function SolarInverterCard({ snap }: { snap: AssetSnapshot }) {
  const res = residualPct(snap)
  const dcPower = snap.dc_voltage_v != null && snap.dc_current_a != null
    ? Math.round(snap.dc_voltage_v * snap.dc_current_a / 1000)
    : null

  return (
    <DashboardCard title={assetLabel(snap)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)', marginBottom: 2 }}>
            {assetTypeLabel(snap.asset_type)} Â· {snap.site_id}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gp-text-primary)' }}>
            {snap.power_kw?.toLocaleString() ?? 'â€”'}&thinsp;
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--gp-text-muted)' }}>kW AC</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)' }}>
            expected {snap.expected_power_kw?.toLocaleString()} kW
            {res != null && ` Â· ${res > 0 ? '+' : ''}${res}% residual`}
          </div>
        </div>
        <StatusBadge label="healthy" color="green" />
      </div>

      <div className="gp-signal-grid">
        {[
          { label: 'DC voltage V', value: snap.dc_voltage_v },
          { label: 'DC current A', value: snap.dc_current_a },
          { label: 'DC power kW', value: dcPower },
          { label: 'AC power kW', value: snap.ac_power_kw ?? snap.power_kw },
          { label: 'Inverter eff %', value: snap.inverter_efficiency_pct },
          { label: 'Ambient Â°C', value: snap.temperature_c },
          { label: 'Avail %', value: snap.availability_pct },
        ].map(({ label, value }) => (
          <div key={label} className="gp-signal-kv">
            <span className="gp-signal-kv__key">{label}</span>
            <span className="gp-signal-kv__val">{value != null ? value.toLocaleString() : 'â€”'}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

function BessCard({ snap }: { snap: AssetSnapshot }) {
  const soc = snap.state_of_charge_pct ?? 0
  const socColor = soc > 80 ? 'var(--gp-green)' : soc > 20 ? 'var(--gp-blue)' : 'var(--gp-red)'

  return (
    <DashboardCard title={assetLabel(snap)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)', marginBottom: 2 }}>
            BESS Â· {snap.site_id}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: socColor }}>{soc.toFixed(1)}%</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gp-text-muted)' }}>SoC</div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--gp-text-muted)' }}>
            SoH {snap.state_of_health_pct?.toFixed(1)}% Â· {snap.cycle_count?.toLocaleString()} cycles
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <StatusBadge
            label={snap.inverter_status ?? 'idle'}
            color={snap.inverter_status === 'discharging' ? 'orange' : snap.inverter_status === 'charging' ? 'blue' : 'slate'}
          />
          {(snap.discharge_power_kw ?? 0) > 0 && (
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 4, color: 'var(--gp-amber-text)' }}>
              â†“ {snap.discharge_power_kw?.toLocaleString()} kW
            </div>
          )}
          {(snap.charge_power_kw ?? 0) > 0 && (
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 4, color: 'var(--gp-blue-dark)' }}>
              â†‘ {snap.charge_power_kw?.toLocaleString()} kW
            </div>
          )}
        </div>
      </div>

      {/* SoC bar */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
          <span style={{ color: 'var(--gp-text-muted)' }}>State of Charge</span>
          <span style={{ fontWeight: 700 }}>{soc.toFixed(1)}%</span>
        </div>
        <div className="gp-progress" style={{ height: 10 }}>
          <div className="gp-progress__bar" style={{ width: `${soc}%`, background: socColor }} />
        </div>
      </div>

      <div className="gp-signal-grid">
        {[
          { label: 'Pack voltage V', value: snap.pack_voltage_v },
          { label: 'Pack current A', value: snap.dc_current_a },
          { label: 'Cell temp Â°C', value: snap.cell_temperature_c, alarm: (snap.cell_temperature_c ?? 0) > 40 },
          { label: 'Thermal derate', value: snap.thermal_derate_flag ? 'YES' : 'no' },
          { label: 'SoH %', value: snap.state_of_health_pct },
          { label: 'Capacity kW', value: snap.capacity_kw },
          { label: 'Avail %', value: snap.availability_pct },
          { label: 'Quality', value: snap.quality_score != null ? (snap.quality_score * 100).toFixed(0) + '%' : 'â€”' },
        ].map(({ label, value, alarm }) => (
          <div key={label} className="gp-signal-kv" style={alarm ? { color: 'var(--gp-red-text)' } : {}}>
            <span className="gp-signal-kv__key">{label}</span>
            <span className="gp-signal-kv__val">{typeof value === 'number' ? value.toLocaleString() : (value ?? 'â€”')}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

// â”€â”€â”€ Fleet output bar chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FleetOutputChart({ assets }: { assets: AssetSnapshot[] }) {
  const data = assets.filter(a => a.power_kw != null).map(a => ({
    id: a.asset_id.split('-').slice(-2).join('-'),
    actual: Math.max(a.power_kw ?? 0, 0),
    expected: a.expected_power_kw ?? 0,
    anomaly: residualPct(a) != null && (residualPct(a) ?? 0) < -10,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <XAxis dataKey="id" tick={{ fontSize: 10, fill: 'var(--gp-text-muted)' }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--gp-text-muted)' }} unit=" kW" />
        <Tooltip
          formatter={(val: number, name: string) => [`${val.toLocaleString()} kW`, name === 'actual' ? 'Actual' : 'Expected']}
          contentStyle={{ background: 'var(--gp-surface)', border: '1px solid var(--gp-border)', fontSize: '0.8rem' }}
        />
        <Bar dataKey="expected" name="Expected" fill="var(--gp-border)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="actual" name="Actual" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.anomaly ? 'var(--gp-red)' : 'var(--gp-blue)'} />
          ))}
        </Bar>
        <ReferenceLine y={0} stroke="var(--gp-border)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// â”€â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TelemetryDashboard() {
  const [siteId, setSiteId]     = useState('solar_nrel_golden_1')
  const [dataMode, setDataMode] = useState<'source' | 'live'>('source')
  const [data, setData]         = useState<any>(null)
  const [loading, setLoading]   = useState(false)
  const [availableSites, setAvailableSites] = useState<string[]>([])

  const fetchTelemetry = async () => {
    setLoading(true)
    try {
      const r = await axios.get(`/api/v1/sites/${siteId}/telemetry/latest?data_mode=${dataMode}`)
      setData(r.data)
      if (Array.isArray(r.data?.available_sites) && r.data.available_sites.length > 0) {
        setAvailableSites(r.data.available_sites)
        if (!r.data.available_sites.includes(siteId)) {
          setSiteId(r.data.available_sites[0])
        }
      }
    } catch {
      setData({ error: 'Telemetry endpoint unreachable' })
    }
    setLoading(false)
  }

  useEffect(() => { fetchTelemetry() }, [siteId, dataMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const assets: AssetSnapshot[] = data?.assets ?? []
  const windAssets  = assets.filter(a => a.asset_type === 'wind_turbine')
  const solarAssets = assets.filter(a => a.asset_type === 'solar_inverter')
  const bessAssets  = assets.filter(a => a.asset_type === 'bess')
  const anomalies   = assets.filter(a => {
    const r = residualPct(a)
    return r != null && r < -10
  })
  const totalActualMW = assets.reduce((s, a) => s + Math.max(a.power_kw ?? 0, 0), 0) / 1000

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="gp-page-title">Telemetry</h1>
            <p className="gp-page-subtitle">
              SCADA fleet snapshot â€” IEC 61400-25 wind Â· IEC 61724-1 solar Â· BMS telemetry.
              Actual vs. expected output, deviation analysis, fault codes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="gp-label" style={{ marginBottom: 0 }}>
              Site
              <select className="gp-select" value={siteId} onChange={e => setSiteId(e.target.value)}>
                {(availableSites.length > 0 ? availableSites : [siteId]).map((s: string) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="gp-label" style={{ marginBottom: 0 }}>
              Data mode
              <select className="gp-select" value={dataMode} onChange={e => setDataMode(e.target.value as any)}>
                <option value="source">Source snapshots (real dataset captures)</option>
                <option value="live">Live (POST /telemetry/ingest)</option>
              </select>
            </label>
            <button onClick={fetchTelemetry} disabled={loading} className="gp-btn gp-btn--sm">
              {loading ? 'âŸ³' : 'âŸ³ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Source mode notice */}
      {dataMode === 'source' && (
        <div className="gp-callout gp-callout--info" style={{ fontSize: '0.82rem' }}>
          <strong>Source mode:</strong> Showing source-backed snapshots loaded from
          <code> data/source_snapshots/</code>. Capture real PV data first with
          <code> python scripts/capture_pvdaq_snapshot.py</code>.
        </div>
      )}

      {data?.error ? (
        <div className="gp-callout gp-callout--danger">{data.error}</div>
      ) : (
        <>
          {/* KPI row */}
          {assets.length > 0 && (
            <div className="gp-stat-grid">
              <StatCard label="Assets" value={assets.length} />
              <StatCard label="Total Output" value={`${totalActualMW.toFixed(1)} MW`} accent="var(--gp-blue)" />
              <StatCard label="Deviations" value={anomalies.length} accent={anomalies.length > 0 ? 'var(--gp-red)' : 'var(--gp-green)'} />
              <StatCard
                label="Fleet Availability"
                value={`${Math.round(assets.filter(a => (a.availability_pct ?? 100) > 90).length / Math.max(assets.length, 1) * 100)}%`}
                accent="var(--gp-teal)"
              />
            </div>
          )}

          {/* Fleet output bar chart */}
          {assets.length > 0 && (
            <DashboardCard title="Fleet Output: Actual vs Expected" subtitle={data?.snapshot_timestamp_utc ? `Snapshot: ${data.snapshot_timestamp_utc}` : undefined}>
              <FleetOutputChart assets={assets} />
            </DashboardCard>
          )}

          {/* Asset detail cards */}
          {windAssets.length > 0 && (
            <>
              <div className="gp-card__title" style={{ marginTop: '0.5rem' }}>Wind Turbines</div>
              <div className="gp-grid gp-grid--2" style={{ gap: 'var(--gp-gap)' }}>
                {windAssets.map(a => <WindTurbineCard key={a.asset_id} snap={a} />)}
              </div>
            </>
          )}
          {solarAssets.length > 0 && (
            <>
              <div className="gp-card__title" style={{ marginTop: '0.5rem' }}>Solar Inverters</div>
              <div className="gp-grid gp-grid--2" style={{ gap: 'var(--gp-gap)' }}>
                {solarAssets.map(a => <SolarInverterCard key={a.asset_id} snap={a} />)}
              </div>
            </>
          )}
          {bessAssets.length > 0 && (
            <>
              <div className="gp-card__title" style={{ marginTop: '0.5rem' }}>Battery Storage</div>
              <div className="gp-grid gp-grid--2" style={{ gap: 'var(--gp-gap)' }}>
                {bessAssets.map(a => <BessCard key={a.asset_id} snap={a} />)}
              </div>
            </>
          )}

          {assets.length === 0 && !loading && (
            <DashboardCard title="No telemetry">
              <p style={{ color: 'var(--gp-text-muted)', margin: 0 }}>
                {dataMode === 'live'
                  ? 'No ingested telemetry for this site. POST to /api/v1/telemetry/ingest first.'
                  : 'No source snapshots found for this site. Capture and place JSON files under data/source_snapshots/.'}
              </p>
            </DashboardCard>
          )}

          {/* Ingestion surface explainer */}
          <DashboardCard title="Supported Telemetry Ingestion Surfaces">
            <div className="gp-grid gp-grid--2">
              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Available now</div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--gp-text-secondary)', lineHeight: 1.8 }}>
                  <li><code>POST /api/v1/telemetry/ingest</code> â€” JSON TelemetryPoint array</li>
                  <li><code>POST /api/v1/telemetry/normalize</code> â€” normalise to AssetTelemetrySnapshot</li>
                  <li><code>GET /api/v1/sites/{'{site_id}'}/telemetry/latest</code> â€” latest snapshot</li>
                  <li><code>GET /api/v1/assets/{'{asset_id}'}/health</code> â€” single-asset health</li>
                </ul>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Planned</div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--gp-text-muted)', lineHeight: 1.8 }}>
                  <li>CSV / Parquet upload â€” POST /api/v1/telemetry/ingest/csv</li>
                  <li>MQTT â€” pub/sub adapter</li>
                  <li>OPC UA â€” normalised point reader</li>
                  <li>Modbus â€” register snapshot adapter</li>
                  <li>SCADA historian connector (OSIsoft PI, Wonderware)</li>
                  <li>REST webhook â€” push from edge gateway</li>
                </ul>
              </div>
            </div>
          </DashboardCard>
        </>
      )}
    </div>
  )
}
