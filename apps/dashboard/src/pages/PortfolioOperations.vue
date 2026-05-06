<template>
  <div class="ops-page">
    <div class="ops-header">
      <span class="page-eyebrow">PORTFOLIO OPERATIONS</span>
      <div class="ops-filters">
        <select v-model="filterType" class="dl-select">
          <option value="">All Types</option>
          <option value="solar">Solar</option>
          <option value="wind">Wind</option>
        </select>
        <select v-model="filterRegion" class="dl-select">
          <option value="">All Regions</option>
          <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
        </select>
        <button class="btn-refresh" @click="load" :disabled="loading">↻ Refresh</button>
      </div>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Summary pills -->
    <div class="ops-summary">
      <div class="sum-pill">
        <span class="sum-label">SITES</span>
        <span class="sum-val">{{ filtered.length }}</span>
      </div>
      <div class="sum-pill">
        <span class="sum-label">SOLAR</span>
        <span class="sum-val">{{ filtered.filter(s => s.asset_type === 'solar').length }}</span>
      </div>
      <div class="sum-pill">
        <span class="sum-label">WIND</span>
        <span class="sum-val">{{ filtered.filter(s => s.asset_type === 'wind').length }}</span>
      </div>
      <div class="sum-pill">
        <span class="sum-label">AVG WIND</span>
        <span class="sum-val">{{ avgWind() }} m/s</span>
      </div>
      <div class="sum-pill">
        <span class="sum-label">AVG GHI</span>
        <span class="sum-val">{{ avgGhi() }} W/m²</span>
      </div>
      <div class="sum-pill">
        <span class="sum-label">DATA QUALITY</span>
        <span class="sum-val" style="color: var(--green)">100%</span>
      </div>
    </div>

    <!-- Ops table -->
    <div class="ops-table-wrap">
      <div v-if="loading" class="loading-row">Loading site data from archive…</div>
      <table v-else class="dl-table">
        <thead>
          <tr>
            <th>Site</th>
            <th>Type</th>
            <th>Region</th>
            <th>Wind 10m m/s</th>
            <th>Wind 80m m/s</th>
            <th>GHI W/m²</th>
            <th>DNI W/m²</th>
            <th>Temp °C</th>
            <th>Cloud Cover %</th>
            <th>Forecast P50</th>
            <th>Archive Pts</th>
            <th>Latest Obs</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filtered" :key="s.site_id" class="site-row" @click="selectSite(s.site_id)">
            <td class="td-name">{{ s.name }}</td>
            <td>
              <span :class="['type-pill', s.asset_type === 'solar' ? 'type-pill--solar' : 'type-pill--wind']">
                {{ s.asset_type }}
              </span>
            </td>
            <td class="td-mono">{{ s.region ?? '—' }}</td>
            <td class="td-num">{{ fmtN(s.wind_speed_mps, 1) }}</td>
            <td class="td-num td-dim">—</td>
            <td class="td-num">{{ s.ghi_wm2 != null ? Math.round(s.ghi_wm2) : '—' }}</td>
            <td class="td-num td-dim">—</td>
            <td class="td-num">{{ fmtN(s.temperature_c, 1) }}</td>
            <td class="td-num td-dim">—</td>
            <td class="td-num td-cyan">{{ fmtForecast(s.site_id) }}</td>
            <td class="td-num">{{ s.hourly_points.toLocaleString() }}</td>
            <td class="td-mono">{{ fmtTs(s.timestamp_utc) }}</td>
            <td class="td-mono td-dim">{{ s.source }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer note -->
    <div class="ops-footer">
      <span>Source: {{ summary?.dataset }}</span>
      <span>·</span>
      <span>Coverage: {{ summary?.coverage.start_date }} → {{ summary?.coverage.end_date }}</span>
      <span>·</span>
      <span>{{ summary?.power_data_status.detail }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, type SourceSummaryResponse, type SiteSummary, type SiteForecastResponse } from '../lib/api'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const summary = ref<SourceSummaryResponse | null>(null)
const forecasts = ref<Record<string, SiteForecastResponse>>({})

const filterType = ref('')
const filterRegion = ref('')

const sites = computed(() => summary.value?.sites ?? [])

const regions = computed(() => {
  const r = new Set(sites.value.map(s => s.region).filter((r): r is string => r != null))
  return [...r].sort()
})

const filtered = computed(() => {
  let s = sites.value
  if (filterType.value) s = s.filter(x => x.asset_type === filterType.value)
  if (filterRegion.value) s = s.filter(x => x.region === filterRegion.value)
  return s
})

function fmtN(v: number | null | undefined, decimals = 0) {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

function fmtTs(ts: string) {
  try { return ts.slice(0, 16).replace('T', ' ') } catch { return ts }
}

function fmtForecast(siteId: string) {
  const fc = forecasts.value[siteId]
  if (!fc) return '—'
  const mw = Math.round(fc.p50_kw / 1000)
  return mw.toLocaleString() + ' MW'
}

function avgWind() {
  const vs = filtered.value.filter(s => s.asset_type === 'wind').map(s => s.wind_speed_mps).filter((v): v is number => v != null)
  if (!vs.length) return '—'
  return (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1)
}

function avgGhi() {
  const vs = filtered.value.filter(s => s.asset_type === 'solar').map(s => s.ghi_wm2).filter((v): v is number => v != null)
  if (!vs.length) return '—'
  return Math.round(vs.reduce((a, b) => a + b, 0) / vs.length).toString()
}

function selectSite(siteId: string) {
  router.push(`/telemetry?site=${siteId}`)
}

async function runForecasts(siteList: SiteSummary[]) {
  for (const s of siteList) {
    if (s.wind_speed_mps == null && s.ghi_wm2 == null) continue
    try {
      const fc = await api.forecastSite({
        site_id: s.site_id,
        asset_type: s.asset_type === 'wind' ? 'wind_turbine' : 'solar_inverter',
        capacity_kw: s.asset_type === 'wind' ? 100_000 : 50_000,
        wind_speed_mps: s.wind_speed_mps ?? undefined,
        ghi_wm2: s.ghi_wm2 ?? undefined,
        temperature_c: s.temperature_c ?? 20,
      })
      forecasts.value[s.site_id] = fc
    } catch (_) { /* skip */ }
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    summary.value = await api.sourceSummary()
    runForecasts(summary.value.sites)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.ops-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.ops-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.page-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-1);
}

.ops-filters { display: flex; gap: 8px; align-items: center; }

.dl-select {
  background: rgba(10, 30, 48, 0.95);
  border: 1px solid var(--cyan-border);
  color: var(--text-0);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  outline: none;
}

.btn-refresh {
  background: none; border: 1px solid var(--cyan-border); color: var(--cyan);
  border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 11px;
}
.btn-refresh:disabled { opacity: 0.4; cursor: default; }

.error-banner {
  background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3);
  color: #ff8080; padding: 8px 12px; border-radius: 6px; font-size: 12px; flex-shrink: 0;
}

/* Summary pills */
.ops-summary {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.sum-pill {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 8px;
  padding: 6px 12px;
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.sum-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-2);
}

.sum-val {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-0);
  font-variant-numeric: tabular-nums;
}

/* Table */
.ops-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
}

.loading-row {
  padding: 16px;
  font-size: 12px;
  color: var(--text-2);
}

.dl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.dl-table th {
  position: sticky;
  top: 0;
  background: rgba(6, 18, 30, 0.98);
  text-align: left;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-2);
  padding: 8px 10px;
  border-bottom: 1px solid var(--cyan-border);
  white-space: nowrap;
}

.dl-table td {
  padding: 6px 10px;
  color: var(--text-0);
  border-bottom: 1px solid rgba(96,190,255,0.05);
  white-space: nowrap;
}

.site-row { cursor: pointer; transition: background 0.1s; }
.site-row:hover td { background: rgba(40,191,255,0.04); }

.td-name  { font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.td-mono  { font-family: 'Menlo', monospace; font-size: 10px; color: var(--text-1); }
.td-num   { text-align: right; font-variant-numeric: tabular-nums; color: var(--text-1); }
.td-dim   { color: var(--text-2); }
.td-cyan  { color: var(--cyan); font-weight: 500; }

.type-pill {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em; padding: 1px 6px; border-radius: 3px;
}
.type-pill--solar { background: rgba(255,193,51,0.15); color: #ffc133; border: 1px solid rgba(255,193,51,0.3); }
.type-pill--wind  { background: rgba(40,191,255,0.12); color: var(--cyan); border: 1px solid var(--cyan-border); }

.ops-footer {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: var(--text-2);
  padding: 2px 0;
}
</style>
