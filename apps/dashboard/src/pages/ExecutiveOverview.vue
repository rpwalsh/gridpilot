<template>
  <div class="exec-page">
    <!-- Header strip -->
    <div class="exec-header">
      <div class="exec-header__left">
        <span class="page-eyebrow">EXECUTIVE OVERVIEW</span>
        <span class="exec-ts">{{ asOf }}</span>
      </div>
      <div class="exec-header__right">
        <span :class="['pill', apiOk ? 'pill--green' : 'pill--red']">
          API {{ apiOk ? 'ONLINE' : 'OFFLINE' }}
        </span>
        <button class="btn-refresh" @click="load" :disabled="loading">↻</button>
      </div>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- KPI row -->
    <div class="exec-kpis">
      <div class="kpi-card">
        <div class="kpi-label">SITES IN PORTFOLIO</div>
        <div class="kpi-value">{{ summary?.totals.site_count ?? '—' }}</div>
        <div class="kpi-sub">{{ summary?.totals.solar_site_count ?? 0 }} solar · {{ summary?.totals.wind_site_count ?? 0 }} wind</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">ARCHIVE DATA POINTS</div>
        <div class="kpi-value">{{ fmtPts(summary?.totals.total_hourly_points) }}</div>
        <div class="kpi-sub">{{ summary?.coverage.years ?? '—' }}-year hourly archive</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">COVERAGE WINDOW</div>
        <div class="kpi-value kpi-value--sm">{{ summary?.coverage.start_date ?? '—' }}</div>
        <div class="kpi-sub">→ {{ summary?.coverage.end_date ?? '—' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">PROVIDERS REACHABLE</div>
        <div class="kpi-value">{{ healthyCount }}<span class="kpi-denom">/{{ providerCount }}</span></div>
        <div class="kpi-sub">{{ degradedCount > 0 ? degradedCount + ' degraded' : 'all nominal' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">AVG WIND SPEED</div>
        <div class="kpi-value">{{ fmtWind() }}<span class="kpi-unit">m/s</span></div>
        <div class="kpi-sub">across {{ windSites.length }} wind sites</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">AVG IRRADIANCE</div>
        <div class="kpi-value">{{ fmtGhi() }}<span class="kpi-unit">W/m²</span></div>
        <div class="kpi-sub">across {{ solarSites.length }} solar sites</div>
      </div>
    </div>

    <!-- Two-column body -->
    <div class="exec-body">
      <!-- LEFT: site table -->
      <div class="exec-panel exec-panel--sites">
        <div class="panel-title">PORTFOLIO SITES <span class="panel-source">source: open-meteo archive</span></div>
        <div v-if="loading" class="loading-row">Loading site data…</div>
        <table v-else class="dl-table">
          <thead>
            <tr>
              <th>Site</th><th>Type</th><th>Region</th>
              <th>Wind m/s</th><th>GHI W/m²</th><th>Temp °C</th>
              <th>Pts</th><th>Latest</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in visibleSites" :key="s.site_id">
              <td class="td-name">{{ s.name }}</td>
              <td><span :class="['type-pill', s.asset_type === 'solar' ? 'type-pill--solar' : 'type-pill--wind']">{{ s.asset_type }}</span></td>
              <td class="td-mono">{{ s.region ?? '—' }}</td>
              <td class="td-num">{{ s.wind_speed_mps != null ? s.wind_speed_mps.toFixed(1) : '—' }}</td>
              <td class="td-num">{{ s.ghi_wm2 != null ? Math.round(s.ghi_wm2) : '—' }}</td>
              <td class="td-num">{{ s.temperature_c != null ? s.temperature_c.toFixed(1) : '—' }}</td>
              <td class="td-num">{{ fmtPts(s.hourly_points) }}</td>
              <td class="td-mono td-ts">{{ fmtTs(s.timestamp_utc) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- RIGHT: provider health + portfolio forecast -->
      <div class="exec-right">
        <!-- Provider health -->
        <div class="exec-panel exec-panel--providers">
          <div class="panel-title">DATA PROVIDER HEALTH <span class="panel-source">live probe</span></div>
          <div v-if="loadingHealth" class="loading-row">Probing…</div>
          <div v-else class="provider-list">
            <div v-for="(v, k) in providerHealth" :key="k" class="provider-row">
              <span class="prov-name">{{ k }}</span>
              <span :class="['prov-status', statusClass(v.status)]">{{ v.status }}</span>
              <span class="prov-latency">{{ v.latency_ms != null ? v.latency_ms + ' ms' : '—' }}</span>
              <span v-if="v.degraded_mode" class="prov-degraded">{{ v.degraded_mode }}</span>
            </div>
          </div>
        </div>

        <!-- Portfolio forecast from real model -->
        <div class="exec-panel exec-panel--forecast">
          <div class="panel-title">MODEL FORECAST <span class="panel-source">dispatchlayer forecasting engine</span></div>
          <div v-if="loadingForecast" class="loading-row">Computing from real weather…</div>
          <div v-else-if="portfolioForecast" class="forecast-summary">
            <div class="fc-row">
              <span class="fc-label">Portfolio P50</span>
              <span class="fc-value">{{ Math.round((portfolioForecast.total_p50_kw ?? 0) / 1000).toLocaleString() }} MW</span>
            </div>
            <div class="fc-row">
              <span class="fc-label">P10 (pessimistic)</span>
              <span class="fc-value fc-value--dim">{{ Math.round((portfolioForecast.total_p10_kw ?? 0) / 1000).toLocaleString() }} MW</span>
            </div>
            <div class="fc-row">
              <span class="fc-label">P90 (optimistic)</span>
              <span class="fc-value fc-value--bright">{{ Math.round((portfolioForecast.total_p90_kw ?? 0) / 1000).toLocaleString() }} MW</span>
            </div>
            <div class="fc-row fc-row--sites">
              <span class="fc-label">Sites computed</span>
              <span class="fc-value">{{ portfolioForecast.sites?.length ?? 0 }}</span>
            </div>
          </div>
          <div v-else class="loading-row">No forecast available — check API connection</div>
        </div>

        <!-- Data notice -->
        <div class="exec-panel exec-panel--notice">
          <div class="panel-title">DATA PROVENANCE</div>
          <div class="notice-text">{{ summary?.power_data_status.detail }}</div>
          <div class="notice-source">Dataset: {{ summary?.dataset }} · Generated: {{ fmtTs(summary?.generated_utc) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, type SourceSummaryResponse, type ProvidersHealthResponse, type PortfolioForecastResponse } from '../lib/api'

const loading = ref(true)
const loadingHealth = ref(true)
const loadingForecast = ref(true)
const error = ref('')
const apiOk = ref(false)
const summary = ref<SourceSummaryResponse | null>(null)
const healthData = ref<ProvidersHealthResponse | null>(null)
const portfolioForecast = ref<PortfolioForecastResponse | null>(null)
const asOf = ref('')

const sites = computed(() => summary.value?.sites ?? [])
const visibleSites = computed(() => sites.value.slice(0, 8))
const solarSites = computed(() => sites.value.filter(s => s.asset_type === 'solar'))
const windSites = computed(() => sites.value.filter(s => s.asset_type === 'wind'))

const providerHealth = computed(() => healthData.value?.providers ?? {})
const providerCount = computed(() => Object.keys(providerHealth.value).length)
const healthyCount = computed(() => Object.values(providerHealth.value).filter(v => v.status === 'success').length)
const degradedCount = computed(() => Object.values(providerHealth.value).filter(v => v.status !== 'success').length)

function fmtPts(n: number | null | undefined) {
  if (n == null) return '—'
  return n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n.toLocaleString()
}

function fmtTs(ts: string | null | undefined) {
  if (!ts) return '—'
  try { return new Date(ts).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' }
  catch { return ts }
}

function fmtWind() {
  const vals = windSites.value.map(s => s.wind_speed_mps).filter((v): v is number => v != null)
  if (!vals.length) return '—'
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

function fmtGhi() {
  const vals = solarSites.value.map(s => s.ghi_wm2).filter((v): v is number => v != null)
  if (!vals.length) return '—'
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length).toString()
}

function statusClass(s: string) {
  if (s === 'success') return 'prov-status--ok'
  if (s === 'unreachable') return 'prov-status--bad'
  return 'prov-status--warn'
}

async function loadForecast(sites: SourceSummaryResponse['sites']) {
  loadingForecast.value = true
  try {
    const forecastSites = sites
      .filter(s => s.wind_speed_mps != null || s.ghi_wm2 != null)
      .map(s => ({
        site_id: s.site_id,
        asset_type: s.asset_type === 'wind' ? 'wind_turbine' as const : 'solar_inverter' as const,
        capacity_kw: s.asset_type === 'wind' ? 100_000 : 50_000,
        wind_speed_mps: s.wind_speed_mps ?? undefined,
        ghi_wm2: s.ghi_wm2 ?? undefined,
        temperature_c: s.temperature_c ?? 20,
      }))
    if (forecastSites.length > 0) {
      portfolioForecast.value = await api.forecastPortfolio('dispatchlayer-demo', 24, forecastSites)
    }
  } catch (e) {
    // forecast is supplementary — don't block the page
  } finally {
    loadingForecast.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  asOf.value = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
  try {
    const [sumData] = await Promise.all([
      api.sourceSummary(),
      api.health().then(h => { apiOk.value = h.status === 'ok' }).catch(() => { apiOk.value = false }),
    ])
    summary.value = sumData
    loadForecast(sumData.sites)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load data'
    apiOk.value = false
  } finally {
    loading.value = false
  }
  loadingHealth.value = true
  api.providersHealth().then(h => { healthData.value = h }).catch(() => {}).finally(() => { loadingHealth.value = false })
}

onMounted(load)
</script>

<style scoped>
.exec-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.exec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.exec-header__left { display: flex; align-items: baseline; gap: 12px; }
.exec-header__right { display: flex; align-items: center; gap: 8px; }

.page-eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-1);
}

.exec-ts {
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
  font-family: 'Menlo', monospace;
}

.pill {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 4px;
}
.pill--green { background: rgba(102, 211, 110, 0.15); color: #66d36e; border: 1px solid rgba(102,211,110,0.3); }
.pill--red   { background: rgba(255, 80, 80, 0.15);  color: #ff5050; border: 1px solid rgba(255,80,80,0.3); }

.btn-refresh {
  background: none; border: 1px solid var(--cyan-border); color: var(--cyan);
  border-radius: 6px; padding: 2px 7px; cursor: pointer; font-size: 11px;
}
.btn-refresh:disabled { opacity: 0.4; cursor: default; }

.error-banner {
  background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3);
  color: #ff8080; padding: 8px 12px; border-radius: 6px; font-size: 12px;
  flex-shrink: 0;
}

/* KPI row */
.exec-kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  flex-shrink: 0;
}

.kpi-card {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 8px;
  padding: 7px 9px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kpi-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-2);
}

.kpi-value {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--text-0);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.kpi-value--sm { font-size: 12px; }
.kpi-denom { font-size: 11px; color: var(--text-2); }
.kpi-unit { font-size: 9px; color: var(--text-2); margin-left: 2px; }

.kpi-sub {
  font-size: 8px;
  color: var(--text-2);
}

/* Body */
.exec-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 6px;
}

.exec-panel {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.exec-panel--sites {
  overflow: hidden;
}

.exec-right {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.exec-panel--providers { flex: 0 0 auto; }
.exec-panel--forecast  { flex: 0 0 auto; }
.exec-panel--notice    { flex: 1; min-height: 0; overflow: hidden; }

.panel-title {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-1);
  margin-bottom: 5px;
  flex-shrink: 0;
}

.panel-source {
  font-weight: 400;
  color: var(--text-2);
  margin-left: 6px;
  letter-spacing: 0;
}

.loading-row {
  font-size: 10px;
  color: var(--text-2);
  padding: 8px 0;
}

/* Table */
.dl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
}

.dl-table th {
  text-align: left;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-2);
  padding: 3px 5px 4px;
  border-bottom: 1px solid var(--cyan-border);
}

.dl-table td {
  padding: 3px 5px;
  color: var(--text-0);
  border-bottom: 1px solid rgba(96,190,255,0.06);
  white-space: nowrap;
}

.td-name { color: var(--text-0); font-weight: 500; max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.td-mono { font-family: 'Menlo', monospace; font-size: 9px; color: var(--text-1); }
.td-num  { text-align: right; font-variant-numeric: tabular-nums; color: var(--text-1); }
.td-ts   { font-size: 9px; }

.type-pill {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  border-radius: 3px;
}
.type-pill--solar { background: rgba(255,193,51,0.15); color: #ffc133; border: 1px solid rgba(255,193,51,0.3); }
.type-pill--wind  { background: rgba(40,191,255,0.12); color: var(--cyan); border: 1px solid var(--cyan-border); }

/* Provider health */
.provider-list { display: flex; flex-direction: column; gap: 4px; }

.provider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
}

.prov-name  { flex: 1; color: var(--text-1); font-family: 'Menlo', monospace; font-size: 9px; }
.prov-status { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; padding: 1px 5px; border-radius: 3px; }
.prov-status--ok   { background: rgba(102,211,110,0.15); color: #66d36e; }
.prov-status--bad  { background: rgba(255,80,80,0.15);   color: #ff5050; }
.prov-status--warn { background: rgba(255,201,51,0.15);  color: #ffc133; }
.prov-latency  { font-size: 9px; color: var(--text-2); font-variant-numeric: tabular-nums; min-width: 44px; text-align: right; }
.prov-degraded { font-size: 8px; color: #ffc133; }

/* Forecast summary */
.forecast-summary { display: flex; flex-direction: column; gap: 6px; }
.fc-row { display: flex; justify-content: space-between; align-items: baseline; }
.fc-label { font-size: 9px; color: var(--text-2); }
.fc-value { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text-0); }
.fc-value--dim    { color: var(--text-1); }
.fc-value--bright { color: var(--cyan); }
.fc-row--sites .fc-value { font-size: 10px; }

/* Notice */
.notice-text { font-size: 9px; color: var(--text-1); line-height: 1.4; }
.notice-source { font-size: 8px; color: var(--text-2); margin-top: 4px; font-family: 'Menlo', monospace; }
</style>
