<!--
  Proprietary (c) Ryan Walsh / Walsh Tech Group
  All rights reserved. Professional preview only.
-->
<template>
  <div class="bp-page">

    <!-- ── Controls ── -->
    <div class="bp-controls">
      <label class="bp-ctrl">
        <span class="bp-ctrl__label">SITE</span>
        <select v-model="selectedSiteId" class="console-input bp-select">
          <option v-for="s in sites" :key="s.site_id" :value="s.site_id">{{ s.name }} ({{ s.asset_type }})</option>
        </select>
      </label>
      <label class="bp-ctrl">
        <span class="bp-ctrl__label">WINDOW</span>
        <select v-model.number="hours" class="console-input bp-select-sm">
          <option :value="48">48 h</option>
          <option :value="72">72 h</option>
          <option :value="168">7 d</option>
        </select>
      </label>
      <template v-if="calibration">
        <div class="bp-kpi"><span class="bp-kpi__k">BIAS</span><span class="bp-kpi__v" :class="calibration.biasClass">{{ calibration.bias }}</span></div>
        <div class="bp-kpi"><span class="bp-kpi__k">MAPE</span><span class="bp-kpi__v">{{ calibration.mape }}%</span></div>
        <div class="bp-kpi"><span class="bp-kpi__k">RMSE</span><span class="bp-kpi__v">{{ calibration.rmse }} MW</span></div>
        <div class="bp-kpi"><span class="bp-kpi__k">AVG SPREAD</span><span class="bp-kpi__v">{{ calibration.avgSpread }} MW</span></div>
        <div class="bp-kpi"><span class="bp-kpi__k">COVERAGE</span><span class="bp-kpi__v" :class="calibration.coverageClass">{{ calibration.coverage }}%</span></div>
        <div class="bp-kpi"><span class="bp-kpi__k">SHARPNESS</span><span class="bp-kpi__v">{{ calibration.sharpness }}</span></div>
      </template>
      <div v-if="loading" class="bp-loading-badge">LOADING…</div>
    </div>

    <!-- ── Charts ── -->
    <div class="bp-grid" v-if="series.length && !loading">

      <!-- Full-width top: time series with filled P10/P90 bands -->
      <div class="bp-panel bp-panel--bands">
        <div class="bp-hdr">
          <span class="bp-title">CONFIDENCE BANDS</span>
          <span class="bp-sub">P10 / P50 / P90 ENVELOPE · {{ hours }}h · MW</span>
        </div>
        <div class="bp-wrap"><canvas ref="bandsCanvas"></canvas></div>
      </div>

      <!-- Residuals time series -->
      <div class="bp-panel bp-panel--residuals">
        <div class="bp-hdr">
          <span class="bp-title">RESIDUAL SERIES</span>
          <span class="bp-sub">NAIVE(t−24) − MODEL(t) · MW</span>
        </div>
        <div class="bp-wrap"><canvas ref="residualsCanvas"></canvas></div>
      </div>

      <!-- Error distribution -->
      <div class="bp-panel bp-panel--errdist">
        <div class="bp-hdr">
          <span class="bp-title">ERROR DISTRIBUTION</span>
          <span class="bp-sub">RESIDUAL HISTOGRAM · MW</span>
        </div>
        <div class="bp-wrap"><canvas ref="errdistCanvas"></canvas></div>
      </div>

      <!-- Hour-of-day bias profile -->
      <div class="bp-panel bp-panel--hourbias">
        <div class="bp-hdr">
          <span class="bp-title">HOUR-OF-DAY BIAS</span>
          <span class="bp-sub">MEAN RESIDUAL BY HOUR · MW</span>
        </div>
        <div class="bp-wrap"><canvas ref="hourbiasCanvas"></canvas></div>
      </div>

    </div>

    <div v-if="loading" class="bp-spinner">COMPUTING CALIBRATION…</div>
    <p v-if="error" class="bp-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import {
  BarController, BarElement, CategoryScale, Chart,
  Filler, LinearScale, LineController, LineElement, PointElement, Tooltip,
} from 'chart.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api, type SiteSummary, type TimeseriesRow } from '../lib/api'

Chart.register(BarController, BarElement, CategoryScale, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip)

const sites = ref<SiteSummary[]>([])
const selectedSiteId = ref('')
const hours = ref(72)
const loading = ref(false)
const error = ref('')
const rows = ref<TimeseriesRow[]>([])
let loadToken = 0

const bandsCanvas = ref<HTMLCanvasElement | null>(null)
const residualsCanvas = ref<HTMLCanvasElement | null>(null)
const errdistCanvas = ref<HTMLCanvasElement | null>(null)
const hourbiasCanvas = ref<HTMLCanvasElement | null>(null)

let bandsChart: Chart | null = null
let residualsChart: Chart | null = null
let errdistChart: Chart | null = null
let hourbiasChart: Chart | null = null

const currentSite = computed(() => sites.value.find(s => s.site_id === selectedSiteId.value) ?? null)
const isWind = computed(() => currentSite.value?.asset_type === 'wind')
const capacityKw = computed(() => isWind.value ? 100_000 : 50_000)
const UNCERTAINTY = 0.25

function modelKw(row: TimeseriesRow): number {
  if (isWind.value) {
    const v = row.wind_speed_80m ?? row.wind_speed_10m ?? 0
    if (v < 3 || v >= 25) return 0
    if (v >= 12) return capacityKw.value
    const r = (v - 3) / 9
    return capacityKw.value * r * r * r
  }
  const ghi = row.shortwave_radiation ?? 0
  if (ghi <= 0) return 0
  const t = row.temperature_2m ?? 25
  const cellT = t + 30 * Math.min(1, ghi / 1000)
  const derate = Math.max(0.5, 1 - 0.004 * (cellT - 25))
  return Math.max(0, capacityKw.value * (ghi / 1000) * derate * 0.83)
}

const series = computed(() => rows.value.map((row, i) => {
  const p50 = modelKw(row)
  // naive baseline: 24h persistence forecast
  const naive = i >= 24 ? modelKw(rows.value[i - 24]) : p50
  return {
    ts: row.ts,
    p50,
    p10: Math.max(0, p50 * (1 - UNCERTAINTY * 1.28)),
    p90: p50 * (1 + UNCERTAINTY * 1.28),
    naive,
    residual: (naive - p50) / 1000, // MW
    hour: Number(row.ts.slice(11, 13)),
  }
}))

const calibration = computed(() => {
  const pts = series.value.slice(24) // skip first 24h (no naive available)
  if (!pts.length) return null
  const residuals = pts.map(p => p.residual)
  const bias = residuals.reduce((s, v) => s + v, 0) / residuals.length
  const mape = pts.reduce((s, p) => s + (p.p50 > 0 ? Math.abs(p.residual) / (p.p50 / 1000) : 0), 0) / pts.length * 100
  const rmse = Math.sqrt(residuals.reduce((s, v) => s + v * v, 0) / residuals.length)
  const avgSpread = pts.reduce((s, p) => s + (p.p90 - p.p10) / 1000, 0) / pts.length
  const covered = pts.filter(p => p.naive * 1000 >= p.p10 && p.naive * 1000 <= p.p90).length
  const coverage = (covered / pts.length) * 100
  const sharpness = avgSpread > 0 ? (coverage / 100 / avgSpread).toFixed(2) : '—'
  return {
    bias: (bias >= 0 ? '+' : '') + bias.toFixed(2) + ' MW',
    biasClass: Math.abs(bias) < 0.5 ? 'bp-kpi__v--green' : 'bp-kpi__v--amber',
    mape: mape.toFixed(1),
    rmse: rmse.toFixed(2),
    avgSpread: avgSpread.toFixed(1),
    coverage: coverage.toFixed(1),
    coverageClass: coverage >= 70 ? 'bp-kpi__v--green' : coverage >= 50 ? 'bp-kpi__v--amber' : 'bp-kpi__v--red',
    sharpness,
  }
})

const TICK = '#5f7688'
const GRID = 'rgba(96,190,255,0.06)'
const BASE: any = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } } }

function buildBands() {
  bandsChart?.destroy()
  if (!bandsCanvas.value || !series.value.length) return
  const pts = series.value
  const step = Math.max(1, Math.floor(pts.length / 300))
  const s = pts.filter((_, i) => i % step === 0)
  const labels = s.map(p => p.ts.slice(5, 16).replace('T', ' '))
  bandsChart = new Chart(bandsCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'P10', data: s.map(p => p.p10 / 1000), borderColor: 'transparent', pointRadius: 0, fill: false },
        { label: 'P90', data: s.map(p => p.p90 / 1000), borderColor: 'transparent', backgroundColor: 'rgba(40,191,255,0.13)', pointRadius: 0, fill: '-1' },
        { label: 'P50', data: s.map(p => p.p50 / 1000), borderColor: 'rgba(40,191,255,0.95)', borderWidth: 2, pointRadius: 0, tension: 0.25, fill: false },
        { label: 'Naive', data: s.map(p => p.naive / 1000), borderColor: 'rgba(255,201,51,0.7)', borderDash: [4, 3], borderWidth: 1.5, pointRadius: 0, fill: false },
        { label: 'Cap', data: s.map(() => capacityKw.value / 1000), borderColor: 'rgba(120,140,156,0.28)', borderDash: [2, 5], borderWidth: 1, pointRadius: 0, fill: false },
      ],
    },
    options: {
      ...BASE,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...BASE.plugins,
        legend: {
          display: true, position: 'top',
          labels: { color: TICK, font: { size: 9 }, boxWidth: 12, padding: 10 },
        },
      },
      scales: {
        x: { ticks: { color: TICK, font: { size: 9 }, maxTicksLimit: 14, maxRotation: 0 }, grid: { color: GRID } },
        y: { ticks: { color: TICK, font: { size: 10 }, callback: (v: unknown) => Number(v).toFixed(0) + ' MW' }, grid: { color: GRID } },
      },
    },
  } as any)
}

function buildResiduals() {
  residualsChart?.destroy()
  if (!residualsCanvas.value || !series.value.length) return
  const pts = series.value.slice(24)
  const step = Math.max(1, Math.floor(pts.length / 200))
  const s = pts.filter((_, i) => i % step === 0)
  residualsChart = new Chart(residualsCanvas.value, {
    type: 'bar',
    data: {
      labels: s.map(p => p.ts.slice(11, 16)),
      datasets: [{
        data: s.map(p => +p.residual.toFixed(2)),
        backgroundColor: s.map(p => p.residual >= 0 ? 'rgba(255,201,51,0.65)' : 'rgba(40,191,255,0.65)'),
        borderColor: 'transparent', borderRadius: 2,
      }],
    },
    options: {
      ...BASE,
      scales: {
        x: { ticks: { color: TICK, font: { size: 9 }, maxTicksLimit: 12, maxRotation: 0 }, grid: { color: GRID } },
        y: { ticks: { color: TICK, font: { size: 10 }, callback: (v: unknown) => Number(v).toFixed(1) + ' MW' }, grid: { color: GRID } },
      },
    },
  })
}

function buildErrDist() {
  errdistChart?.destroy()
  if (!errdistCanvas.value || !series.value.length) return
  const resids = series.value.slice(24).map(p => p.residual)
  const min = Math.min(...resids), max = Math.max(...resids)
  const bins = 16, bw = (max - min) / bins || 1
  const counts = Array(bins).fill(0)
  for (const v of resids) counts[Math.min(bins - 1, Math.floor((v - min) / bw))]++
  errdistChart = new Chart(errdistCanvas.value, {
    type: 'bar',
    data: {
      labels: Array.from({ length: bins }, (_, i) => (min + i * bw).toFixed(1)),
      datasets: [{
        data: counts,
        backgroundColor: Array.from({ length: bins }, (_, i) => {
          const mid = min + (i + 0.5) * bw
          return mid < 0 ? 'rgba(40,191,255,0.65)' : mid > 0 ? 'rgba(255,201,51,0.65)' : 'rgba(102,211,110,0.65)'
        }),
        borderColor: 'transparent', borderRadius: 2,
      }],
    },
    options: {
      ...BASE,
      scales: {
        x: { ticks: { color: TICK, font: { size: 9 }, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: GRID } },
        y: { ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } },
      },
    },
  })
}

function buildHourBias() {
  hourbiasChart?.destroy()
  if (!hourbiasCanvas.value || !series.value.length) return
  const buckets = Array.from({ length: 24 }, () => ({ sum: 0, cnt: 0 }))
  for (const p of series.value.slice(24)) { buckets[p.hour].sum += p.residual; buckets[p.hour].cnt++ }
  const biases = buckets.map(b => b.cnt ? +(b.sum / b.cnt).toFixed(2) : 0)
  hourbiasChart = new Chart(hourbiasCanvas.value, {
    type: 'bar',
    data: {
      labels: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00'),
      datasets: [{
        data: biases,
        backgroundColor: biases.map(v => v >= 0 ? 'rgba(255,201,51,0.7)' : 'rgba(40,191,255,0.7)'),
        borderColor: 'transparent', borderRadius: 3,
      }],
    },
    options: {
      ...BASE,
      scales: {
        x: { ticks: { color: TICK, font: { size: 8 }, maxRotation: 0 }, grid: { color: GRID } },
        y: { ticks: { color: TICK, font: { size: 10 }, callback: (v: unknown) => Number(v).toFixed(1) + ' MW' }, grid: { color: GRID } },
      },
    },
  })
}

function destroyAll() {
  bandsChart?.destroy(); bandsChart = null
  residualsChart?.destroy(); residualsChart = null
  errdistChart?.destroy(); errdistChart = null
  hourbiasChart?.destroy(); hourbiasChart = null
}

async function renderAll() {
  await nextTick()
  buildBands(); buildResiduals(); buildErrDist(); buildHourBias()
}

async function loadData() {
  if (!selectedSiteId.value) return
  const token = ++loadToken
  loading.value = true
  error.value = ''
  destroyAll()
  try {
    const ts = await Promise.race([
      api.timeseries(selectedSiteId.value, hours.value),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), 8000)),
    ])
    if (token !== loadToken) return
    rows.value = ts.rows
    loading.value = false
    await nextTick()
    await renderAll()
  } catch (e: any) {
    if (token !== loadToken) return
    error.value = e?.message ?? 'LOAD_FAILED'
  } finally {
    if (token === loadToken && loading.value) loading.value = false
  }
}

watch([selectedSiteId, hours], () => {
  void loadData()
})

onMounted(async () => {
  try {
    const summary = await api.sourceSummary()
    sites.value = summary.sites
    if (summary.sites.length) {
      selectedSiteId.value = summary.sites[0].site_id
      await loadData()
    }
  } catch { error.value = 'SITES_UNAVAILABLE' }
})
onBeforeUnmount(destroyAll)
</script>

<style scoped>
.bp-page { height: 100%; display: flex; flex-direction: column; gap: 10px; overflow: hidden; }

.bp-controls {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 14px; background: rgba(7,17,28,0.95);
  border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; flex-shrink: 0;
}
.bp-ctrl { display: flex; flex-direction: column; gap: 4px; }
.bp-ctrl__label { font-size: 8px; font-weight: 700; letter-spacing: 0.14em; color: var(--text-2); text-transform: uppercase; }
.bp-select { min-width: 180px; }
.bp-select-sm { min-width: 72px; }
.bp-kpi { display: flex; flex-direction: column; gap: 2px; padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
.bp-kpi__k { font-size: 8px; font-weight: 700; letter-spacing: 0.1em; color: var(--text-2); text-transform: uppercase; }
.bp-kpi__v { font-size: 11px; font-family: 'Menlo', monospace; color: var(--text-0); font-weight: 700; line-height: 1; }
.bp-kpi__v--green { color: #69e3aa; }
.bp-kpi__v--amber { color: #ffc933; }
.bp-kpi__v--red   { color: #ff8a8a; }
.bp-loading-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--cyan); padding: 4px 10px; border: 1px solid rgba(40,191,255,0.3); border-radius: 8px; animation: pulse 1.5s infinite; }

.bp-grid {
  flex: 1; min-height: 0; display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1.6fr) minmax(0, 1fr);
  grid-template-areas:
    'bands     bands     bands'
    'residuals errdist   hourbias';
  gap: 10px;
}
.bp-panel--bands     { grid-area: bands; }
.bp-panel--residuals { grid-area: residuals; }
.bp-panel--errdist   { grid-area: errdist; }
.bp-panel--hourbias  { grid-area: hourbias; }

.bp-panel {
  background: rgba(7,17,28,0.95); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column;
  gap: 8px; min-height: 0; overflow: hidden; position: relative;
}
.bp-panel::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(40,191,255,0.45), transparent); }
.bp-hdr { display: flex; gap: 8px; align-items: baseline; flex-shrink: 0; }
.bp-title { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-2); }
.bp-sub { font-size: 8px; color: var(--text-2); opacity: 0.6; }
.bp-wrap { flex: 1; min-height: 0; position: relative; }
.bp-wrap :deep(canvas) { width: 100% !important; height: 100% !important; }

.bp-spinner { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: var(--text-2); text-align: center; padding: 40px; }
.bp-error { color: #ff7043; font-size: 12px; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

@media (max-width: 1024px) {
  .bp-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-areas: 'bands bands' 'residuals errdist' 'hourbias hourbias';
    grid-template-rows: minmax(180px, 1.4fr) minmax(140px, 1fr) minmax(140px, 1fr);
    overflow-y: auto;
  }
}
</style>


<style scoped>
.page-grid { display: grid; gap: 14px; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.chart { height: 240px; }
.table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
</style>
