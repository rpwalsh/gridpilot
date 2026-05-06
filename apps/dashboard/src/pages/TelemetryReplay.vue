<template>
  <div class="replay-page">
    <div class="replay-header">
      <span class="page-eyebrow">TELEMETRY REPLAY</span>
      <div class="replay-controls">
        <select v-model="selectedSite" class="dl-select" @change="loadSite">
          <option v-for="s in catalog" :key="s.site_id" :value="s.site_id">
            {{ s.name }} ({{ s.asset_type }})
          </option>
        </select>
        <select v-model="hours" class="dl-select" @change="loadSite">
          <option :value="48">48 h</option>
          <option :value="168">7 d</option>
          <option :value="720">30 d</option>
          <option :value="2160">90 d</option>
        </select>
        <select v-model="primaryField" class="dl-select">
          <option value="wind_speed_10m">Wind 10m m/s</option>
          <option value="wind_speed_80m">Wind 80m m/s</option>
          <option value="shortwave_radiation">GHI W/m²</option>
          <option value="direct_normal_irradiance">DNI W/m²</option>
          <option value="temperature_2m">Temperature °C</option>
          <option value="cloud_cover">Cloud Cover %</option>
          <option value="precipitation">Precipitation mm</option>
          <option value="pressure_msl">Pressure hPa</option>
        </select>
        <button class="btn-refresh" @click="loadSite" :disabled="loading">↻</button>
      </div>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Current frame KPIs -->
    <div class="frame-kpis" v-if="currentRow">
      <div class="fkpi">
        <span class="fkpi-label">TIMESTAMP</span>
        <span class="fkpi-val">{{ currentRow.ts.replace('T', ' ') }} UTC</span>
      </div>
      <div class="fkpi" v-if="currentRow.wind_speed_10m != null">
        <span class="fkpi-label">WIND 10m</span>
        <span class="fkpi-val">{{ currentRow.wind_speed_10m?.toFixed(1) }} m/s</span>
      </div>
      <div class="fkpi" v-if="currentRow.wind_speed_80m != null">
        <span class="fkpi-label">WIND 80m</span>
        <span class="fkpi-val">{{ currentRow.wind_speed_80m?.toFixed(1) }} m/s</span>
      </div>
      <div class="fkpi" v-if="currentRow.shortwave_radiation != null">
        <span class="fkpi-label">GHI</span>
        <span class="fkpi-val">{{ Math.round(currentRow.shortwave_radiation ?? 0) }} W/m²</span>
      </div>
      <div class="fkpi" v-if="currentRow.temperature_2m != null">
        <span class="fkpi-label">TEMP</span>
        <span class="fkpi-val">{{ currentRow.temperature_2m?.toFixed(1) }} °C</span>
      </div>
      <div class="fkpi" v-if="currentRow.cloud_cover != null">
        <span class="fkpi-label">CLOUD COVER</span>
        <span class="fkpi-val">{{ currentRow.cloud_cover }} %</span>
      </div>
      <div class="fkpi" v-if="currentRow.relative_humidity_2m != null">
        <span class="fkpi-label">HUMIDITY</span>
        <span class="fkpi-val">{{ currentRow.relative_humidity_2m?.toFixed(0) }} %</span>
      </div>
      <div class="fkpi fkpi--source">
        <span class="fkpi-label">SOURCE</span>
        <span class="fkpi-val fkpi-val--dim">{{ tsData?.source }}</span>
      </div>
    </div>

    <!-- Chart -->
    <div class="chart-panel">
      <div class="chart-label">
        {{ primaryFieldLabel }} — {{ tsData?.name }} · {{ tsData?.region }}
        <span class="chart-pts">{{ tsData?.hours_returned?.toLocaleString() }} points</span>
      </div>
      <div v-if="loading" class="loading-row">Loading archive data…</div>
      <div v-else class="chart-wrap">
        <canvas ref="canvasRef"></canvas>
      </div>
    </div>

    <!-- Cursor slider -->
    <div class="replay-scrub" v-if="rows.length > 0">
      <span class="scrub-label">CURSOR</span>
      <input
        type="range"
        :min="0"
        :max="rows.length - 1"
        v-model.number="cursorIdx"
        class="scrub-range"
      />
      <span class="scrub-ts">{{ rows[cursorIdx]?.ts?.replace('T', ' ') }} UTC</span>
    </div>

    <!-- Data footer -->
    <div class="replay-footer" v-if="tsData">
      Archive: {{ tsData.archive_total_hours.toLocaleString() }} hourly points · lat {{ tsData.latitude?.toFixed(4) }} · lon {{ tsData.longitude?.toFixed(4) }} · source: {{ tsData.source }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, CategoryScale, Filler, Tooltip } from 'chart.js'
import { api, type TimeseriesResponse, type TimeseriesRow } from '../lib/api'
import type { SiteSummary } from '../lib/api'

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, CategoryScale, Filler, Tooltip)

const route = useRoute()
const loading = ref(true)
const error = ref('')
const catalog = ref<SiteSummary[]>([])
const tsData = ref<TimeseriesResponse | null>(null)
const selectedSite = ref('')
const hours = ref(168)
const primaryField = ref('wind_speed_10m')
const cursorIdx = ref(0)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const rows = computed(() => tsData.value?.rows ?? [])
const currentRow = computed<TimeseriesRow | null>(() => rows.value[cursorIdx.value] ?? null)

const FIELD_LABELS: Record<string, string> = {
  wind_speed_10m: 'Wind Speed 10m (m/s)',
  wind_speed_80m: 'Wind Speed 80m (m/s)',
  shortwave_radiation: 'Shortwave Radiation / GHI (W/m²)',
  direct_normal_irradiance: 'Direct Normal Irradiance (W/m²)',
  temperature_2m: 'Air Temperature 2m (°C)',
  cloud_cover: 'Cloud Cover (%)',
  precipitation: 'Precipitation (mm)',
  pressure_msl: 'Mean Sea-Level Pressure (hPa)',
}

const primaryFieldLabel = computed(() => FIELD_LABELS[primaryField.value] ?? primaryField.value)

async function loadCatalog() {
  try {
    const s = await api.sourceSummary()
    catalog.value = s.sites
    if (catalog.value.length > 0) {
      const siteParam = route.query.site as string
      selectedSite.value = (siteParam && catalog.value.find(x => x.site_id === siteParam))
        ? siteParam
        : catalog.value[0].site_id
      // Default to appropriate field for site type
      const site = catalog.value.find(x => x.site_id === selectedSite.value)
      if (site?.asset_type === 'solar') primaryField.value = 'shortwave_radiation'
      await loadSite()
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load catalog'
    loading.value = false
  }
}

async function loadSite() {
  if (!selectedSite.value) return
  loading.value = true
  error.value = ''
  try {
    tsData.value = await api.timeseries(selectedSite.value, hours.value)
    cursorIdx.value = Math.max(0, rows.value.length - 1)
    await nextTick()
    renderChart()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load timeseries'
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!canvasRef.value || rows.value.length === 0) return
  if (chart) { chart.destroy(); chart = null }

  const labels = rows.value.map(r => r.ts.slice(0, 16).replace('T', ' '))
  const values = rows.value.map(r => (r as any)[primaryField.value] as number | null)

  chart = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: 'rgba(40,191,255,0.8)',
        backgroundColor: 'rgba(40,191,255,0.08)',
        borderWidth: 1.2,
        pointRadius: 0,
        fill: true,
        tension: 0.3,
        spanGaps: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (items) => items[0]?.label ?? '',
            label: (item) => {
              const v = item.raw as number | null
              return v != null ? `${primaryFieldLabel.value}: ${v}` : 'null'
            },
          },
          backgroundColor: 'rgba(4,14,24,0.95)',
          borderColor: 'rgba(40,191,255,0.3)',
          borderWidth: 1,
          titleColor: '#91a8b8',
          bodyColor: '#e6f4ff',
          titleFont: { size: 10, family: 'Menlo' },
          bodyFont: { size: 11 },
          padding: 8,
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#5f7688',
            font: { size: 9, family: 'Menlo' },
            maxRotation: 0,
            maxTicksLimit: 12,
          },
          grid: { color: 'rgba(96,190,255,0.06)' },
        },
        y: {
          ticks: { color: '#5f7688', font: { size: 10 } },
          grid: { color: 'rgba(96,190,255,0.06)' },
        },
      },
    },
  })
}

watch(primaryField, () => { if (!loading.value) renderChart() })

onMounted(loadCatalog)
onBeforeUnmount(() => { if (chart) chart.destroy() })
</script>

<style scoped>
.replay-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.replay-header {
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

.replay-controls { display: flex; gap: 8px; align-items: center; }

.dl-select {
  background: rgba(10,30,48,0.95);
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
.btn-refresh:disabled { opacity: 0.4; }

.error-banner {
  background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3);
  color: #ff8080; padding: 8px 12px; border-radius: 6px; font-size: 12px; flex-shrink: 0;
}

/* Frame KPIs */
.frame-kpis {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.fkpi {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 8px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 90px;
}

.fkpi--source { flex: 1; }

.fkpi-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-2);
}

.fkpi-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-0);
  font-variant-numeric: tabular-nums;
}

.fkpi-val--dim {
  font-size: 10px;
  font-weight: 400;
  color: var(--text-2);
  font-family: 'Menlo', monospace;
}

/* Chart */
.chart-panel {
  flex: 1;
  min-height: 0;
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chart-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-1);
  flex-shrink: 0;
}

.chart-pts { font-size: 10px; font-weight: 400; color: var(--text-2); margin-left: 8px; }

.loading-row { font-size: 12px; color: var(--text-2); padding: 8px 0; }

.chart-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}

/* Scrubber */
.replay-scrub {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.scrub-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-2);
  flex-shrink: 0;
}

.scrub-range {
  flex: 1;
  accent-color: var(--cyan);
  cursor: pointer;
}

.scrub-ts {
  font-size: 10px;
  font-family: 'Menlo', monospace;
  color: var(--text-1);
  min-width: 140px;
  text-align: right;
}

.replay-footer {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--text-2);
  font-family: 'Menlo', monospace;
  padding-bottom: 2px;
}
</style>
