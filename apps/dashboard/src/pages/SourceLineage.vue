<template>
  <div class="lineage-page">
    <div class="lineage-header">
      <span class="page-eyebrow">SOURCE LINEAGE &amp; DATA QUALITY</span>
      <button class="btn-refresh" @click="load" :disabled="loading">↻ Refresh</button>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Lineage pipeline diagram -->
    <div class="lineage-pipeline">
      <div
        v-for="(node, i) in pipelineNodes"
        :key="node.id"
        class="pipeline-step"
      >
        <div :class="['pipe-node', `pipe-node--${node.status}`]">
          <div class="pipe-label">{{ node.label }}</div>
          <div class="pipe-kind">{{ node.kind }}</div>
        </div>
        <div class="pipe-arrow" v-if="i < pipelineNodes.length - 1">→</div>
      </div>
    </div>

    <!-- Summary strip -->
    <div class="source-kpis">
      <div class="skpi">
        <div class="skpi-label">PROVIDERS CONFIGURED</div>
        <div class="skpi-val">{{ providerList.length }}</div>
      </div>
      <div class="skpi">
        <div class="skpi-label">KEY-FREE PROVIDERS</div>
        <div class="skpi-val">{{ providerList.filter(p => !p.requires_key).length }}</div>
      </div>
      <div class="skpi">
        <div class="skpi-label">SITES IN ARCHIVE</div>
        <div class="skpi-val">{{ summary?.totals.site_count ?? '—' }}</div>
      </div>
      <div class="skpi">
        <div class="skpi-label">TOTAL ARCHIVE POINTS</div>
        <div class="skpi-val">{{ fmtPts(summary?.totals.total_hourly_points) }}</div>
      </div>
      <div class="skpi">
        <div class="skpi-label">COVERAGE START</div>
        <div class="skpi-val skpi-val--sm">{{ summary?.coverage.start_date }}</div>
      </div>
      <div class="skpi">
        <div class="skpi-label">COVERAGE END</div>
        <div class="skpi-val skpi-val--sm">{{ summary?.coverage.end_date }}</div>
      </div>
      <div class="skpi">
        <div class="skpi-label">WEATHER DATA STATUS</div>
        <div class="skpi-val" style="color: var(--green)">AVAILABLE</div>
      </div>
      <div class="skpi">
        <div class="skpi-label">POWER DATA STATUS</div>
        <div class="skpi-val" style="color: #ffc133">OFFLINE</div>
      </div>
    </div>

    <!-- Two-column body -->
    <div class="lineage-body">
      <!-- Provider table -->
      <div class="lineage-panel">
        <div class="panel-title">DATA PROVIDERS <span class="panel-source">source: api config</span></div>
        <div v-if="loadingProviders" class="loading-row">Loading…</div>
        <table v-else class="dl-table">
          <thead>
            <tr>
              <th>Provider</th><th>Enabled</th><th>Requires Key</th><th>Key Configured</th>
              <th>Health</th><th>Latency</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in providerList" :key="p.name">
              <td class="td-mono">{{ p.name }}</td>
              <td><span :class="['status-pill', p.enabled ? 'sp--green' : 'sp--gray']">{{ p.enabled ? 'ENABLED' : 'DISABLED' }}</span></td>
              <td class="td-center">{{ p.requires_key ? '✓' : '—' }}</td>
              <td class="td-center">
                <span v-if="p.requires_key" :class="['status-pill', p.key_configured ? 'sp--green' : 'sp--red']">
                  {{ p.key_configured ? 'SET' : 'MISSING' }}
                </span>
                <span v-else class="td-dim">n/a</span>
              </td>
              <td>
                <span :class="['status-pill', healthClass(p.name)]">{{ healthLabel(p.name) }}</span>
              </td>
              <td class="td-num td-mono">{{ healthLatency(p.name) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Site archive quality table -->
      <div class="lineage-panel">
        <div class="panel-title">SITE ARCHIVE QUALITY <span class="panel-source">source: open-meteo archive</span></div>
        <div v-if="loading" class="loading-row">Loading…</div>
        <table v-else class="dl-table">
          <thead>
            <tr>
              <th>Site ID</th><th>Type</th><th>Region</th>
              <th>Hourly Pts</th><th>Latest Obs</th>
              <th>Wind Available</th><th>GHI Available</th><th>Temp Available</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sites" :key="s.site_id">
              <td class="td-mono">{{ s.site_id }}</td>
              <td><span :class="['type-pill', s.asset_type === 'solar' ? 'type-pill--solar' : 'type-pill--wind']">{{ s.asset_type }}</span></td>
              <td class="td-mono">{{ s.region ?? '—' }}</td>
              <td class="td-num">{{ s.hourly_points.toLocaleString() }}</td>
              <td class="td-mono">{{ s.timestamp_utc?.slice(0, 16).replace('T', ' ') }}</td>
              <td class="td-center">
                <span :class="['avail-dot', s.wind_speed_mps != null ? 'avail-dot--ok' : 'avail-dot--na']"></span>
              </td>
              <td class="td-center">
                <span :class="['avail-dot', s.ghi_wm2 != null ? 'avail-dot--ok' : 'avail-dot--na']"></span>
              </td>
              <td class="td-center">
                <span :class="['avail-dot', s.temperature_c != null ? 'avail-dot--ok' : 'avail-dot--na']"></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer notice -->
    <div class="lineage-footer">
      {{ summary?.power_data_status.detail }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, type SourceSummaryResponse, type ProvidersHealthResponse, type ProviderConfig } from '../lib/api'

const loading = ref(true)
const loadingProviders = ref(true)
const error = ref('')
const summary = ref<SourceSummaryResponse | null>(null)
const providerListData = ref<ProviderConfig[]>([])
const healthData = ref<ProvidersHealthResponse | null>(null)

const sites = computed(() => summary.value?.sites ?? [])
const providerList = computed(() => providerListData.value)

interface PipelineNode {
  id: string
  label: string
  kind: string
  status: 'ok' | 'warn' | 'error'
}

const pipelineNodes = computed<PipelineNode[]>(() => [
  { id: 'source', label: 'DATA SOURCES', kind: 'open-meteo · nasa-power · noaa-nws', status: 'ok' },
  { id: 'ingest', label: 'INGESTION', kind: 'HTTP adapter · schema validation', status: 'ok' },
  { id: 'norm', label: 'NORMALIZATION', kind: 'unit conversion · field mapping', status: 'ok' },
  { id: 'store', label: 'ARCHIVE STORE', kind: '5yr hourly JSON · S3-compatible', status: 'ok' },
  { id: 'feature', label: 'FEATURE EXTRACTION', kind: 'wind speed · GHI · temperature', status: 'ok' },
  { id: 'model', label: 'FORECAST MODEL', kind: 'dispatchlayer-forecasting v0.1.0', status: 'ok' },
  { id: 'output', label: 'DECISION OUTPUT', kind: 'P10/P50/P90 · decision trace', status: 'ok' },
])

function fmtPts(n: number | null | undefined) {
  if (n == null) return '—'
  return n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n.toLocaleString()
}

function healthClass(name: string) {
  const h = healthData.value?.providers?.[name]
  if (!h) return 'sp--gray'
  if (h.status === 'success') return 'sp--green'
  if (h.status === 'unreachable') return 'sp--red'
  return 'sp--yellow'
}

function healthLabel(name: string) {
  const h = healthData.value?.providers?.[name]
  if (!h) return '—'
  return h.status.toUpperCase()
}

function healthLatency(name: string) {
  const h = healthData.value?.providers?.[name]
  if (!h || h.latency_ms == null) return '—'
  return h.latency_ms + ' ms'
}

async function load() {
  loading.value = true
  loadingProviders.value = true
  error.value = ''
  try {
    const [sum, providers] = await Promise.all([
      api.sourceSummary(),
      api.providersList(),
    ])
    summary.value = sum
    providerListData.value = providers.providers
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load'
  } finally {
    loading.value = false
    loadingProviders.value = false
  }
  api.providersHealth()
    .then(h => { healthData.value = h })
    .catch(() => {})
}

onMounted(load)
</script>

<style scoped>
.lineage-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.lineage-header {
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

.btn-refresh {
  background: none; border: 1px solid var(--cyan-border); color: var(--cyan);
  border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 11px;
}

.error-banner {
  background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3);
  color: #ff8080; padding: 8px 12px; border-radius: 6px; font-size: 12px; flex-shrink: 0;
}

/* Pipeline diagram */
.lineage-pipeline {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 10px 16px;
  overflow-x: auto;
}

.pipeline-step {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.pipe-node {
  background: rgba(8, 25, 40, 0.9);
  border-radius: 8px;
  padding: 6px 10px;
  min-width: 90px;
  text-align: center;
}

.pipe-node--ok    { border: 1px solid rgba(102,211,110,0.4); }
.pipe-node--warn  { border: 1px solid rgba(255,201,51,0.4); }
.pipe-node--error { border: 1px solid rgba(255,80,80,0.4); }

.pipe-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-0);
}

.pipe-kind {
  font-size: 8px;
  color: var(--text-2);
  margin-top: 2px;
  font-family: 'Menlo', monospace;
}

.pipe-arrow {
  color: var(--text-2);
  font-size: 14px;
}

/* KPI strip */
.source-kpis {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.skpi {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 8px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 80px;
}

.skpi-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-2);
}

.skpi-val {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-0);
  font-variant-numeric: tabular-nums;
}

.skpi-val--sm { font-size: 12px; font-family: 'Menlo', monospace; }

/* Body */
.lineage-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.lineage-panel {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.panel-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-1);
  margin-bottom: 8px;
  flex-shrink: 0;
}

.panel-source {
  font-weight: 400;
  color: var(--text-2);
  letter-spacing: 0;
  font-size: 10px;
  margin-left: 6px;
}

.loading-row { font-size: 12px; color: var(--text-2); padding: 8px 0; }

.dl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.dl-table th {
  text-align: left;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-2);
  padding: 4px 8px 6px;
  border-bottom: 1px solid var(--cyan-border);
  white-space: nowrap;
}

.dl-table td {
  padding: 5px 8px;
  color: var(--text-0);
  border-bottom: 1px solid rgba(96,190,255,0.05);
  white-space: nowrap;
}

.td-mono   { font-family: 'Menlo', monospace; font-size: 10px; color: var(--text-1); }
.td-num    { text-align: right; font-variant-numeric: tabular-nums; }
.td-center { text-align: center; }
.td-dim    { color: var(--text-2); }

.status-pill {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  border-radius: 3px;
}
.sp--green  { background: rgba(102,211,110,0.15); color: #66d36e; }
.sp--red    { background: rgba(255,80,80,0.15);   color: #ff5050; }
.sp--yellow { background: rgba(255,201,51,0.15);  color: #ffc133; }
.sp--gray   { background: rgba(100,120,140,0.15); color: #91a8b8; }

.type-pill {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em; padding: 1px 6px; border-radius: 3px;
}
.type-pill--solar { background: rgba(255,193,51,0.15); color: #ffc133; border: 1px solid rgba(255,193,51,0.3); }
.type-pill--wind  { background: rgba(40,191,255,0.12); color: var(--cyan); border: 1px solid var(--cyan-border); }

.avail-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.avail-dot--ok { background: #66d36e; }
.avail-dot--na { background: rgba(100,120,140,0.4); }

.lineage-footer {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--text-2);
  padding-bottom: 2px;
}
</style>
