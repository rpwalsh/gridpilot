/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useEffect, useState } from 'react'
import DashboardCard from '../components/DashboardCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import axios from 'axios'

type AssetSnap = {
  asset_id: string
  site_id: string
  asset_type: string
  capacity_kw?: number
  power_kw?: number
  expected_power_kw?: number
  availability_pct?: number
  temperature_c?: number
  wind_speed_mps?: number
  quality_score?: number
  data_source?: string
}

type HealthResp = {
  asset_id: string
  anomaly_detected?: boolean
  residual_pct?: number | null
  health_score?: number
  fault_code?: string | null
}

export default function AssetHealth() {
  const [siteId, setSiteId] = useState('solar_nrel_golden_1')
  const [availableSites, setAvailableSites] = useState<string[]>([])
  const [assets, setAssets] = useState<AssetSnap[]>([])
  const [health, setHealth] = useState<Record<string, HealthResp>>({})
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const t = await axios.get(`/api/v1/sites/${siteId}/telemetry/latest?data_mode=source`)
      const a: AssetSnap[] = t.data?.assets ?? []
      setAssets(a)

      if (Array.isArray(t.data?.available_sites) && t.data.available_sites.length > 0) {
        setAvailableSites(t.data.available_sites)
        if (!t.data.available_sites.includes(siteId)) {
          setSiteId(t.data.available_sites[0])
        }
      }

      const next: Record<string, HealthResp> = {}
      await Promise.all(
        a.map(async (s) => {
          try {
            const r = await axios.get(`/api/v1/assets/${s.asset_id}/health?data_mode=source`)
            next[s.asset_id] = r.data
          } catch {
            next[s.asset_id] = { asset_id: s.asset_id }
          }
        })
      )
      setHealth(next)
    } catch {
      setAssets([])
      setHealth({})
    }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [siteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const anomalyCount = Object.values(health).filter(h => h.anomaly_detected).length
  const avgHealth = Object.values(health).length > 0
    ? Math.round((Object.values(health).reduce((s, h) => s + (h.health_score ?? 0), 0) / Object.values(health).length) * 100)
    : 0

  return (
    <div className="gp-grid">
      <div className="gp-page-header">
        <h1 className="gp-page-title">Asset State</h1>
        <p className="gp-page-subtitle">
          Real source-backed asset health view from telemetry snapshots and API health scoring.
        </p>
      </div>

      <DashboardCard title="Filters" action={<button onClick={refresh} disabled={loading} className="gp-btn gp-btn--sm">{loading ? 'âŸ³ Loadingâ€¦' : 'âŸ³ Refresh'}</button>}>
        <label className="gp-label" style={{ marginBottom: 0 }}>
          Site
          <select className="gp-select" value={siteId} onChange={e => setSiteId(e.target.value)}>
            {(availableSites.length > 0 ? availableSites : [siteId]).map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </DashboardCard>

      <div className="gp-stat-grid">
        <StatCard label="Assets" value={assets.length} />
        <StatCard label="Anomalies" value={anomalyCount} accent={anomalyCount > 0 ? 'var(--gp-red)' : 'var(--gp-green)'} />
        <StatCard label="Avg Health" value={`${avgHealth}%`} accent="var(--gp-blue)" />
      </div>

      {assets.length === 0 && !loading && (
        <DashboardCard title="No source assets">
          <p style={{ margin: 0, color: 'var(--gp-text-muted)' }}>
            No source telemetry snapshots found for this site.
          </p>
        </DashboardCard>
      )}

      {assets.length > 0 && (
        <div className="gp-grid gp-grid--2">
          {assets.map((a) => {
            const h = health[a.asset_id]
            const residual = h?.residual_pct
            const badge = h?.anomaly_detected ? 'anomaly' : 'nominal'
            const badgeColor = h?.anomaly_detected ? 'red' : 'green'

            return (
              <DashboardCard key={a.asset_id} title={a.asset_id} subtitle={`${a.asset_type} Â· ${a.site_id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <StatusBadge label={badge} color={badgeColor} />
                  <div style={{ fontSize: '0.8rem', color: 'var(--gp-text-muted)' }}>
                    {a.data_source ?? 'source'}
                  </div>
                </div>

                <div className="gp-signal-grid">
                  <div className="gp-signal-kv"><span className="gp-signal-kv__key">Power kW</span><span className="gp-signal-kv__val">{a.power_kw != null ? a.power_kw.toFixed(2) : 'â€”'}</span></div>
                  <div className="gp-signal-kv"><span className="gp-signal-kv__key">Expected kW</span><span className="gp-signal-kv__val">{a.expected_power_kw != null ? a.expected_power_kw.toFixed(2) : 'â€”'}</span></div>
                  <div className="gp-signal-kv"><span className="gp-signal-kv__key">Residual %</span><span className="gp-signal-kv__val">{residual != null ? `${residual.toFixed(1)}%` : 'â€”'}</span></div>
                  <div className="gp-signal-kv"><span className="gp-signal-kv__key">Availability %</span><span className="gp-signal-kv__val">{a.availability_pct != null ? a.availability_pct.toFixed(1) : 'â€”'}</span></div>
                  <div className="gp-signal-kv"><span className="gp-signal-kv__key">Temperature Â°C</span><span className="gp-signal-kv__val">{a.temperature_c != null ? a.temperature_c.toFixed(1) : 'â€”'}</span></div>
                  <div className="gp-signal-kv"><span className="gp-signal-kv__key">Wind m/s</span><span className="gp-signal-kv__val">{a.wind_speed_mps != null ? a.wind_speed_mps.toFixed(2) : 'â€”'}</span></div>
                  <div className="gp-signal-kv"><span className="gp-signal-kv__key">Quality</span><span className="gp-signal-kv__val">{a.quality_score != null ? `${Math.round(a.quality_score * 100)}%` : 'â€”'}</span></div>
                  <div className="gp-signal-kv"><span className="gp-signal-kv__key">Health score</span><span className="gp-signal-kv__val">{h?.health_score != null ? `${Math.round(h.health_score * 100)}%` : 'â€”'}</span></div>
                </div>

                {h?.fault_code && (
                  <div className="gp-callout gp-callout--danger" style={{ marginTop: '0.5rem' }}>
                    Fault: <code>{h.fault_code}</code>
                  </div>
                )}
              </DashboardCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
