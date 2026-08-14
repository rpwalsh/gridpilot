<template>
  <div class="overview">
    <!-- Page header -->
    <div class="ov-header">
      <h1 class="gp-page-header__title">Portfolio Overview</h1>
      <div class="ov-header-right">
        <span class="section-label">{{ nowStr }}</span>
        <button class="gp-replay-button" @click="refresh">↻ Refresh</button>
      </div>
    </div>

    <!-- KPI strip -->
    <div class="ov-kpi-strip">
      <div class="ov-kpi glass-panel">
        <span class="ov-kpi-label">Output</span>
        <span class="ov-kpi-value">{{ metrics.output_mw.toFixed(1) }}<em>MW</em></span>
      </div>
      <div class="ov-kpi glass-panel">
        <span class="ov-kpi-label">Capacity</span>
        <span class="ov-kpi-value">{{ metrics.capacity_pct.toFixed(1) }}<em>%</em></span>
      </div>
      <div class="ov-kpi glass-panel">
        <span class="ov-kpi-label">Telemetry Integrity</span>
        <span class="ov-kpi-value">{{ metrics.telemetry_integrity_pct.toFixed(2) }}<em>%</em></span>
      </div>
      <div class="ov-kpi glass-panel">
        <span class="ov-kpi-label">Forecast Confidence</span>
        <span class="ov-kpi-value">{{ metrics.forecast_confidence_pct.toFixed(1) }}<em>%</em></span>
      </div>
    </div>

    <!-- Main 2-column body -->
    <div class="ov-body">
      <!-- Left: chart -->
      <article class="ov-chart-panel glass-panel">
        <p class="section-label" style="margin:0 0 8px">Output Trend — Last 7 Days</p>
        <div class="ov-chart-wrap">
          <Line :data="trendData" :options="chartOptions" />
        </div>
      </article>

      <!-- Right: two tables stacked -->
      <div class="ov-tables">
        <article class="glass-panel ov-table-panel">
          <p class="section-label" style="margin:0 0 6px">Source Health</p>
          <div class="ov-scroll">
            <table class="gp-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Fresh</th>
                  <th>Int.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in sourceHealth" :key="row.source">
                  <td>{{ row.source }}</td>
                  <td>{{ row.type }}</td>
                  <td>{{ row.freshness }}</td>
                  <td>{{ row.integrity ?? 'n/a' }}</td>
                  <td><StatusBadge :status="row.status" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="glass-panel ov-table-panel">
          <p class="section-label" style="margin:0 0 6px">Provider Status</p>
          <div class="ov-scroll">
            <table class="gp-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Quality</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in providerStatus" :key="row.provider">
                  <td>{{ row.provider }}</td>
                  <td>{{ row.type }}</td>
                  <td><StatusBadge :status="row.status" /></td>
                  <td>{{ row.latency }}</td>
                  <td>{{ row.quality }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import {
  SYSTEM_METRICS,
  SOURCE_HEALTH,
  PROVIDER_STATUS,
  type SystemMetrics,
  type SourceRow,
  type ProviderRow,
} from '../lib/overview'
import type {
  OverviewSourceSummaryResponse,
  ProviderHealthResponse,
} from '../lib/api-types'
import StatusBadge from '../components/StatusBadge.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const trendDays = Array.from({ length: 7 }, (_, i) => {
  const d = new Date('2026-05-06')
  d.setDate(d.getDate() - (6 - i))
  return d.toISOString().slice(5, 10)
})
const trendData = {
  labels: trendDays,
  datasets: [{
    label: 'Output MW',
    data: trendDays.map((_, i) => parseFloat((SYSTEM_METRICS.output_mw * (0.88 + i * 0.024)).toFixed(2))),
    borderColor: 'rgba(80, 190, 255, 0.9)',
    backgroundColor: 'rgba(80, 190, 255, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 3,
  }],
}
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#91a8b8', font: { size: 11 } }, grid: { color: 'rgba(80,190,255,0.06)' } },
    y: { ticks: { color: '#91a8b8', font: { size: 11 } }, grid: { color: 'rgba(80,190,255,0.06)' } },
  },
}

const metrics = ref<SystemMetrics>(SYSTEM_METRICS)
const sourceHealth = ref<SourceRow[]>(SOURCE_HEALTH)
const providerStatus = ref<ProviderRow[]>(PROVIDER_STATUS)

const nowStr = ref('')
let clock: ReturnType<typeof setInterval> | null = null
function tick() {
  nowStr.value = new Date().toUTCString().replace('GMT', 'UTC')
}
onMounted(() => { tick(); clock = setInterval(tick, 1000) })
onBeforeUnmount(() => { if (clock) clearInterval(clock) })

function normalizeProviderStatus(status?: string): ProviderRow['status'] {
  const s = (status ?? '').toLowerCase()
  if (s === 'success') return 'GOOD'
  if (s === 'degraded' || s === 'unconfigured') return 'DEGRADED'
  return 'BAD'
}

async function refresh() {
  try {
    const [overviewResp, providerResp] = await Promise.all([
      axios.get<OverviewSourceSummaryResponse>('/api/v1/overview/source-summary'),
      axios.get<ProviderHealthResponse>('/api/v1/providers/health'),
    ])
    const summary = overviewResp.data
    const providers = providerResp.data?.providers ?? {}
    metrics.value = {
      ...metrics.value,
      output_mw: (summary?.totals?.total_hourly_points ?? metrics.value.output_mw * 10000) / 10000,
    }
    providerStatus.value = Object.entries(providers).map(([provider, info]) => ({
      provider,
      type: 'API',
      status: normalizeProviderStatus(info?.status),
      latency: info?.latency_ms != null ? `${info.latency_ms} ms` : 'n/a',
      quality: info?.degraded_mode ? 'degraded' : 'ok',
    }))
  } catch { /* keep fixture data */ }
}
</script>

<style scoped>
.overview {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.ov-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.ov-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ov-kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.ov-kpi {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ov-kpi-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.055em;
  text-transform: uppercase;
  color: #91a8b8;
}

.ov-kpi-value {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #e6f4ff;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.ov-kpi-value em {
  font-style: normal;
  font-size: 11px;
  color: #91a8b8;
  margin-left: 2px;
}

.ov-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 10px;
}

.ov-chart-panel {
  padding: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.ov-chart-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}

.ov-tables {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.ov-table-panel {
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ov-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.ov-scroll::-webkit-scrollbar { width: 4px; }
.ov-scroll::-webkit-scrollbar-track { background: transparent; }
.ov-scroll::-webkit-scrollbar-thumb { background: rgba(80,190,255,0.2); border-radius: 2px; }

/* Override gp-table for tighter spacing */
.gp-table th, .gp-table td {
  padding: 5px 8px;
  font-size: 11px;
}
.gp-table th {
  background: transparent;
  color: #5f7688;
  border-bottom: 1px solid rgba(80,190,255,0.12);
}
.gp-table td { border-bottom: 1px solid rgba(80,190,255,0.07); }
.gp-table tr:hover td { background: rgba(27,91,135,0.12); }
</style>

