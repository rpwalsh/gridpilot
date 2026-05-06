<template>
  <div class="fc-page">
    <div class="fc-header">
      <span class="page-eyebrow">FORECASTING &amp; MODEL PERFORMANCE</span>
      <div class="fc-controls">
        <select v-model="selectedSite" class="dl-select" @change="loadAll">
          <option v-for="s in catalog" :key="s.site_id" :value="s.site_id">
            {{ s.name }} ({{ s.asset_type }})
          </option>
        </select>
        <button class="btn-refresh" @click="loadAll" :disabled="loading">↻</button>
      </div>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>
    <div v-else-if="forecastNotice" class="error-banner">{{ forecastNotice }}</div>

    <!-- Model summary strip -->
    <div class="model-strip" v-if="forecast">
      <div class="ms-card">
        <div class="ms-label">MODEL</div>
        <div class="ms-val">dispatchlayer forecasting v0.1.0</div>
      </div>
      <div class="ms-card">
        <div class="ms-label">SITE TYPE</div>
        <div class="ms-val">{{ selectedSiteType === 'wind' ? 'Wind Turbine (polynomial power curve)' : 'Solar Inverter (PVWatts irradiance)' }}</div>
      </div>
      <div class="ms-card">
        <div class="ms-label">P10</div>
        <div class="ms-val">{{ Math.round((forecast.p10_kw ?? 0) / 1000).toLocaleString() }} MW</div>
      </div>
      <div class="ms-card">
        <div class="ms-label">P50</div>
        <div class="ms-val ms-val--cyan">{{ Math.round((forecast.p50_kw ?? 0) / 1000).toLocaleString() }} MW</div>
      </div>
      <div class="ms-card">
        <div class="ms-label">P90</div>
        <div class="ms-val">{{ Math.round((forecast.p90_kw ?? 0) / 1000).toLocaleString() }} MW</div>
      </div>
      <div class="ms-card">
        <div class="ms-label">UNCERTAINTY</div>
        <div class="ms-val">{{ (forecast.uncertainty_score * 100).toFixed(1) }}%</div>
      </div>
    </div>

    <!-- Two-column body -->
    <div class="fc-body">
      <!-- LEFT: charts -->
      <div class="fc-left">
        <div class="fc-chart-panel fc-chart-panel--main">
          <div class="panel-title">
            {{ chartFieldLabel }} — last {{ tsData?.hours_returned?.toLocaleString() }} h
            <span class="panel-source">source: {{ tsData?.source }}</span>
            <select v-model="chartField" class="dl-select dl-select--sm" style="margin-left:auto">
              <option value="forecast_proxy">Forecast Proxy</option>
              <option v-if="selectedSiteType === 'wind'" value="wind_speed_10m">Wind 10m</option>
              <option v-if="selectedSiteType === 'wind'" value="wind_speed_80m">Wind 80m</option>
              <option v-if="selectedSiteType === 'solar'" value="direct_normal_irradiance">DNI</option>
              <option value="temperature_2m">Temperature</option>
              <option value="cloud_cover">Cloud Cover</option>
            </select>
          </div>
          <div v-if="loading" class="loading-row">Loading…</div>
          <div v-else class="chart-wrap">
            <canvas ref="mainCanvas"></canvas>
          </div>
        </div>

        <div class="fc-chart-panel fc-chart-panel--bands" v-if="forecast">
          <div class="panel-title">
            FORECAST BANDS
            <span class="panel-source">p10 / p50 / p90 (kW)</span>
          </div>
          <div class="chart-wrap chart-wrap--bands">
            <canvas ref="bandCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- RIGHT: decision trace + model details -->
      <div class="fc-right">
        <!-- Decision trace -->
        <div class="fc-panel fc-panel--trace">
          <div class="panel-title">DECISION TRACE</div>
          <div v-if="forecast?.decision_trace" class="trace-steps">
            <div
              v-for="(step, idx) in traceSteps"
              :key="idx"
              class="trace-step"
            >
              <div class="ts-step">{{ step.step }}</div>
              <div class="ts-reasoning">{{ step.reasoning }}</div>
              <div class="ts-output" v-if="step.output != null">
                output: {{ formatTraceOutput(step.output) }}
              </div>
            </div>
            <div v-if="!traceSteps.length" class="loading-row">No trace available</div>
          </div>
          <div v-else class="loading-row">Run forecast to see trace</div>
        </div>

        <!-- Feature inputs -->
        <div class="fc-panel fc-panel--features">
          <div class="panel-title">FEATURE INPUTS</div>
          <div class="feature-list">
            <div class="feature-row" v-if="currentSite?.wind_speed_mps != null">
              <span class="feat-name">wind_speed_mps</span>
              <span class="feat-val">{{ currentSite.wind_speed_mps.toFixed(2) }}</span>
              <span class="feat-src">open-meteo archive</span>
            </div>
            <div class="feature-row" v-if="currentSite?.ghi_wm2 != null">
              <span class="feat-name">ghi_wm2</span>
              <span class="feat-val">{{ Math.round(currentSite.ghi_wm2) }}</span>
              <span class="feat-src">open-meteo archive</span>
            </div>
            <div class="feature-row" v-if="currentSite?.temperature_c != null">
              <span class="feat-name">temperature_c</span>
              <span class="feat-val">{{ currentSite.temperature_c.toFixed(1) }}</span>
              <span class="feat-src">open-meteo archive</span>
            </div>
            <div class="feature-row">
              <span class="feat-name">capacity_kw</span>
              <span class="feat-val">{{ selectedSiteType === 'wind' ? '100,000' : '50,000' }}</span>
              <span class="feat-src">catalog metadata</span>
            </div>
            <div class="feature-row">
              <span class="feat-name">asset_type</span>
              <span class="feat-val">{{ selectedSiteType === 'wind' ? 'wind_turbine' : 'solar_inverter' }}</span>
              <span class="feat-src">catalog metadata</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Chart,
  LineController,
  LineElement,
  BarController,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js'
import { api, type TimeseriesResponse, type SiteForecastResponse } from '../lib/api'
import type { SiteSummary } from '../lib/api'

Chart.register(
  LineController,
  LineElement,
  BarController,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
)

const loading = ref(false)
const error = ref('')
const catalog = ref<SiteSummary[]>([])
const tsData = ref<TimeseriesResponse | null>(null)
const forecast = ref<SiteForecastResponse | null>(null)
const forecastNotice = ref('')
const selectedSite = ref('')
const chartField = ref('wind_speed_10m')
const mainCanvas = ref<HTMLCanvasElement | null>(null)
const bandCanvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null
let bandChart: Chart | null = null

const currentSite = computed(() => catalog.value.find(s => s.site_id === selectedSite.value) ?? null)
const selectedSiteType = computed(() => currentSite.value?.asset_type ?? 'wind')

const FIELD_LABELS: Record<string, string> = {
  forecast_proxy: 'Forecast Proxy (kW)',
  wind_speed_10m: 'Wind Speed 10m (m/s)',
  wind_speed_80m: 'Wind Speed 80m (m/s)',
  direct_normal_irradiance: 'Direct Normal Irradiance (W/m²)',
  temperature_2m: 'Temperature 2m (°C)',
  cloud_cover: 'Cloud Cover (%)',
}

const chartFieldLabel = computed(() => FIELD_LABELS[chartField.value] ?? chartField.value)

interface TraceStep { step: string; reasoning: string; output: unknown }

const traceSteps = computed<TraceStep[]>(() => {
  const trace = forecast.value?.decision_trace
  if (!trace || typeof trace !== 'object') return []
  const steps = (trace as any).steps
  if (!Array.isArray(steps)) return []
  return steps as TraceStep[]
})

function formatTraceOutput(o: unknown): string {
  if (o == null) return '—'
  if (typeof o === 'number') return o.toFixed(2)
  if (typeof o === 'object') {
    return Object.entries(o as Record<string, unknown>)
      .map(([k, v]) => `${k}=${typeof v === 'number' ? (v as number).toFixed(1) : v}`)
      .join(' · ')
  }
  return String(o)
}

function getCapacityKw() {
  return selectedSiteType.value === 'wind' ? 100_000 : 50_000
}

function getForecastProxyValue(row: TimeseriesResponse['rows'][number]) {
  const capacityKw = getCapacityKw()

  if (selectedSiteType.value === 'wind') {
    const windSpeed = row.wind_speed_10m ?? row.wind_speed_80m
    if (windSpeed == null || windSpeed < 3 || windSpeed >= 25) return 0
    if (windSpeed >= 12) return capacityKw
    const normalizedSpeed = (windSpeed - 3) / 9
    return capacityKw * normalizedSpeed * normalizedSpeed * normalizedSpeed
  }

  const ghi = row.shortwave_radiation
  if (ghi == null) return null
  const temperature = row.temperature_2m ?? 20
  const temperatureDerate = Math.max(0.7, 1 - Math.max(temperature - 25, 0) * 0.004)
  return Math.max(0, capacityKw * (ghi / 1000) * 0.75 * temperatureDerate)
}

function getChartValue(row: TimeseriesResponse['rows'][number]) {
  if (chartField.value === 'forecast_proxy') {
    return getForecastProxyValue(row)
  }

  switch (chartField.value) {
    case 'wind_speed_10m':
      return row.wind_speed_10m ?? null
    case 'wind_speed_80m':
      return row.wind_speed_80m ?? null
    case 'direct_normal_irradiance':
      return row.direct_normal_irradiance ?? null
    case 'temperature_2m':
      return row.temperature_2m ?? null
    case 'cloud_cover':
      return row.cloud_cover ?? null
    default:
      return null
  }
}

async function loadAll() {
  if (!selectedSite.value) return
  loading.value = true
  error.value = ''
  forecastNotice.value = ''
  const site = currentSite.value
  if (!site) { loading.value = false; return }

  // Set appropriate default chart field
  chartField.value = 'forecast_proxy'

  try {
    const ts = await api.timeseries(selectedSite.value, 720)
    tsData.value = ts
    const rows = ts.rows ?? []
    const lastRow = rows.length > 0 ? rows[rows.length - 1] : null

    // Prefer site summary signals, then most recent timeseries row.
    const windSpeed = site.wind_speed_mps ?? lastRow?.wind_speed_10m ?? undefined
    const ghi = site.ghi_wm2 ?? lastRow?.shortwave_radiation ?? undefined
    const temperature = site.temperature_c ?? lastRow?.temperature_2m ?? 20

    const isWind = site.asset_type === 'wind'
    const missingRequiredInput = isWind ? windSpeed == null : ghi == null

    if (missingRequiredInput) {
      forecast.value = null
      forecastNotice.value = isWind
        ? 'Forecast unavailable: missing wind speed input for selected wind site.'
        : 'Forecast unavailable: missing irradiance input for selected solar site.'
    } else {
      forecast.value = await api.forecastSite({
        site_id: site.site_id,
        asset_type: isWind ? 'wind_turbine' : 'solar_inverter',
        capacity_kw: isWind ? 100_000 : 50_000,
        wind_speed_mps: windSpeed,
        ghi_wm2: ghi,
        temperature_c: temperature,
      })
    }

    await nextTick()
    renderChart()
    renderBandChart()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load'
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!mainCanvas.value || !tsData.value?.rows.length) return
  if (chart) { chart.destroy(); chart = null }

  const rows = tsData.value.rows
  const labels = rows.map(r => r.ts.slice(5, 16).replace('T', ' '))
  const values = rows.map(r => getChartValue(r))

  chart = new Chart(mainCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: 'rgba(40,191,255,0.8)',
        backgroundColor: 'rgba(40,191,255,0.07)',
        borderWidth: 1.2,
        pointRadius: 0,
        fill: true,
        tension: 0.3,
        spanGaps: true,
        label: chartFieldLabel.value,
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
          ticks: { color: '#5f7688', font: { size: 9 }, maxRotation: 0, maxTicksLimit: 12 },
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

function renderBandChart() {
  if (!bandCanvas.value || !forecast.value) return
  if (bandChart) { bandChart.destroy(); bandChart = null }

  const p10 = forecast.value.p10_kw ?? 0
  const p50 = forecast.value.p50_kw ?? 0
  const p90 = forecast.value.p90_kw ?? 0

  bandChart = new Chart(bandCanvas.value, {
    type: 'bar',
    data: {
      labels: ['p10', 'p50', 'p90'],
      datasets: [{
        data: [p10, p50, p90],
        backgroundColor: ['rgba(120,150,180,0.65)', 'rgba(40,191,255,0.75)', 'rgba(120,150,180,0.65)'],
        borderColor: ['rgba(120,150,180,0.9)', 'rgba(40,191,255,0.95)', 'rgba(120,150,180,0.9)'],
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(4,14,24,0.95)',
          borderColor: 'rgba(40,191,255,0.3)',
          borderWidth: 1,
          titleColor: '#91a8b8',
          bodyColor: '#e6f4ff',
          callbacks: {
            label: (ctx) => `${Math.round(ctx.raw as number).toLocaleString()} kW`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#5f7688', font: { size: 10 } },
          grid: { color: 'rgba(96,190,255,0.06)' },
        },
        y: {
          ticks: {
            color: '#5f7688',
            font: { size: 10 },
            callback: (v) => Number(v).toLocaleString(),
          },
          grid: { color: 'rgba(96,190,255,0.06)' },
        },
      },
    },
  })
}

watch(chartField, () => { if (!loading.value) renderChart() })
watch(forecast, async () => {
  await nextTick()
  renderBandChart()
})

async function loadCatalog() {
  try {
    const s = await api.sourceSummary()
    catalog.value = s.sites
    if (s.sites.length > 0) {
      selectedSite.value = s.sites[0].site_id
      await loadAll()
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load catalog'
  }
}

onMounted(loadCatalog)
onBeforeUnmount(() => {
  if (chart) chart.destroy()
  if (bandChart) bandChart.destroy()
})
</script>

<style scoped>
.fc-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.fc-header {
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

.fc-controls { display: flex; gap: 8px; align-items: center; }

.dl-select {
  background: rgba(10,30,48,0.95);
  border: 1px solid var(--cyan-border);
  color: var(--text-0);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  outline: none;
}

.dl-select--sm { padding: 2px 6px; font-size: 10px; }

.btn-refresh {
  background: none; border: 1px solid var(--cyan-border); color: var(--cyan);
  border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 11px;
}
.btn-refresh:disabled { opacity: 0.4; }

.error-banner {
  background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3);
  color: #ff8080; padding: 8px 12px; border-radius: 6px; font-size: 12px; flex-shrink: 0;
}

/* Model strip */
.model-strip {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.ms-card {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 8px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.ms-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-2);
}

.ms-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-0);
  font-variant-numeric: tabular-nums;
  font-family: 'Menlo', monospace;
}

.ms-val--cyan { color: var(--cyan); }

/* Body */
.fc-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 10px;
}

.fc-left {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.fc-chart-panel {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.fc-chart-panel--main {
  flex: 1;
  min-height: 320px;
}

.fc-chart-panel--bands {
  flex: 0 0 180px;
}

.panel-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-1);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.panel-source {
  font-weight: 400;
  color: var(--text-2);
  letter-spacing: 0;
  font-size: 10px;
}

.loading-row { font-size: 12px; color: var(--text-2); padding: 8px 0; }

.chart-wrap {
  flex: 1;
  min-height: 240px;
  position: relative;
}

.chart-wrap :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
}

.chart-wrap--bands {
  min-height: 120px;
}

.fc-right {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.fc-panel {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fc-panel--trace { flex: 1; min-height: 0; overflow: auto; }
.fc-panel--features { flex: 0 0 auto; }

.trace-steps { display: flex; flex-direction: column; gap: 8px; }

.trace-step {
  border-left: 2px solid rgba(40,191,255,0.3);
  padding-left: 8px;
}

.ts-step {
  font-size: 10px;
  font-weight: 700;
  color: var(--cyan);
  font-family: 'Menlo', monospace;
  letter-spacing: 0.04em;
}

.ts-reasoning {
  font-size: 10px;
  color: var(--text-1);
  line-height: 1.4;
  margin-top: 2px;
}

.ts-output {
  font-size: 9px;
  color: var(--text-2);
  font-family: 'Menlo', monospace;
  margin-top: 2px;
}

.feature-list { display: flex; flex-direction: column; gap: 4px; }

.feature-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 11px;
}

.feat-name  { flex: 1; font-family: 'Menlo', monospace; font-size: 10px; color: var(--text-1); }
.feat-val   { font-variant-numeric: tabular-nums; color: var(--text-0); font-weight: 500; min-width: 60px; text-align: right; }
.feat-src   { font-size: 9px; color: var(--text-2); min-width: 110px; text-align: right; }
</style>
