<!--
  Proprietary (c) Ryan Walsh / Walsh Tech Group
  All rights reserved. Professional preview only.
-->
<template>
  <div class="ch-page">

    <div class="ch-controls">
      <label class="ch-ctrl">
        <span class="ch-ctrl__label">SITE</span>
        <select v-model="selectedSiteId" class="console-input ch-select">
          <option v-for="s in sites" :key="s.site_id" :value="s.site_id">{{ s.name }} ({{ s.asset_type }})</option>
        </select>
      </label>
      <label class="ch-ctrl">
        <span class="ch-ctrl__label">WINDOW</span>
        <select v-model.number="hours" class="console-input ch-select-sm">
          <option :value="72">72 h</option>
          <option :value="168">7 d</option>
          <option :value="336">14 d</option>
          <option :value="720">30 d</option>
        </select>
      </label>
      <template v-if="stats">
        <div class="ch-kpi"><span class="ch-kpi__k">P50 NOW</span><span class="ch-kpi__v">{{ fmtMw(stats.latestP50) }}</span></div>
        <div class="ch-kpi"><span class="ch-kpi__k">CF</span><span class="ch-kpi__v">{{ stats.cf.toFixed(1) }}%</span></div>
        <div class="ch-kpi"><span class="ch-kpi__k">PEAK</span><span class="ch-kpi__v">{{ fmtMw(stats.peak) }}</span></div>
        <div class="ch-kpi"><span class="ch-kpi__k">MEDIAN</span><span class="ch-kpi__v">{{ fmtMw(stats.median) }}</span></div>
        <div class="ch-kpi"><span class="ch-kpi__k">RAMP σ</span><span class="ch-kpi__v">{{ fmtMw(stats.rampSigma) }}</span></div>
        <div class="ch-kpi"><span class="ch-kpi__k">ROWS</span><span class="ch-kpi__v">{{ stats.rowCount.toLocaleString() }}</span></div>
      </template>
      <div v-if="loading" class="ch-loading-badge">LOADING…</div>
    </div>

    <div class="ch-grid" v-if="rows.length && !loading">

      <div class="ch-panel ch-panel--envelope">
        <div class="ch-hdr"><span class="ch-title">GENERATION ENVELOPE</span><span class="ch-sub">P10 / P50 / P90 · {{ hours }}h · MW</span></div>
        <div class="ch-wrap"><canvas ref="envCanvas"></canvas></div>
      </div>

      <div class="ch-panel ch-panel--diurnal">
        <div class="ch-hdr"><span class="ch-title">DIURNAL PROFILE</span><span class="ch-sub">MEAN OUTPUT BY HOUR-OF-DAY · MW</span></div>
        <div class="ch-wrap"><canvas ref="diurnalCanvas"></canvas></div>
      </div>

      <div class="ch-panel ch-panel--hist">
        <div class="ch-hdr"><span class="ch-title">OUTPUT DISTRIBUTION</span><span class="ch-sub">HISTOGRAM · 20 BINS · MW</span></div>
        <div class="ch-wrap"><canvas ref="histCanvas"></canvas></div>
      </div>

      <div class="ch-panel ch-panel--ramp">
        <div class="ch-hdr"><span class="ch-title">RAMP RATE</span><span class="ch-sub">HOURLY Δ MW</span></div>
        <div class="ch-wrap"><canvas ref="rampCanvas"></canvas></div>
      </div>

      <div class="ch-panel ch-panel--weather">
        <div class="ch-hdr"><span class="ch-title">{{ weatherTitle }}</span><span class="ch-sub">DRIVER vs OUTPUT SCATTER</span></div>
        <div class="ch-wrap"><canvas ref="weatherCanvas"></canvas></div>
      </div>

      <div class="ch-panel ch-panel--band">
        <div class="ch-hdr"><span class="ch-title">BAND WIDTH</span><span class="ch-sub">P90 − P10 UNCERTAINTY · MW</span></div>
        <div class="ch-wrap"><canvas ref="bandCanvas"></canvas></div>
      </div>

    </div>

    <div v-if="loading" class="ch-spinner">LOADING ANALYTICS…</div>
    <p v-if="error" class="ch-error">{{ error }}</p>

  </div>
</template>

<script setup lang="ts">
import {
  BarController, BarElement, CategoryScale, Chart,
  Filler, LinearScale, LineController, LineElement, PointElement, ScatterController, Tooltip,
} from 'chart.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api, type SiteSummary, type TimeseriesRow } from '../lib/api'

Chart.register(
  BarController, BarElement, CategoryScale,
  Filler, LinearScale, LineController, LineElement, PointElement, ScatterController, Tooltip,
)

const sites = ref<SiteSummary[]>([])
const selectedSiteId = ref('')
const hours = ref(168)
const loading = ref(false)
const error = ref('')
const rows = ref<TimeseriesRow[]>([])
let loadToken = 0

const envCanvas = ref<HTMLCanvasElement | null>(null)
const diurnalCanvas = ref<HTMLCanvasElement | null>(null)
const histCanvas = ref<HTMLCanvasElement | null>(null)
const rampCanvas = ref<HTMLCanvasElement | null>(null)
const weatherCanvas = ref<HTMLCanvasElement | null>(null)
const bandCanvas = ref<HTMLCanvasElement | null>(null)

let envChart: Chart | null = null
let diurnalChart: Chart | null = null
let histChart: Chart | null = null
let rampChart: Chart | null = null
let weatherChart: Chart | null = null
let bandChart: Chart | null = null

const currentSite = computed(() => sites.value.find(s => s.site_id === selectedSiteId.value) ?? null)
const isWind = computed(() => currentSite.value?.asset_type === 'wind')
const capacityKw = computed(() => isWind.value ? 100_000 : 50_000)
const weatherTitle = computed(() => isWind.value ? 'WIND SPEED vs OUTPUT' : 'GHI vs OUTPUT')

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

const series = computed(() => rows.value.map(row => {
  const p50 = modelKw(row)
  return {
    ts: row.ts,
    p50,
    p10: Math.max(0, p50 * (1 - UNCERTAINTY * 1.28)),
    p90: p50 * (1 + UNCERTAINTY * 1.28),
    driver: isWind.value
      ? (row.wind_speed_80m ?? row.wind_speed_10m ?? 0)
      : (row.shortwave_radiation ?? 0),
  }
}))

const stats = computed(() => {
  const pts = series.value
  if (!pts.length) return null
  const p50s = pts.map(p => p.p50)
  const sorted = [...p50s].sort((a, b) => a - b)
  const ramps = pts.slice(1).map((p, i) => Math.abs(p.p50 - pts[i].p50))
  const rampMean = ramps.reduce((s, v) => s + v, 0) / (ramps.length || 1)
  const rampSigma = Math.sqrt(ramps.reduce((s, v) => s + (v - rampMean) ** 2, 0) / (ramps.length || 1))
  return {
    latestP50: pts[pts.length - 1]?.p50 ?? 0,
    cf: (p50s.reduce((s, v) => s + v, 0) / p50s.length / capacityKw.value) * 100,
    peak: sorted[sorted.length - 1] ?? 0,
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    rampSigma,
    rowCount: pts.length,
  }
})

function fmtMw(kw: number) { return (kw / 1000).toFixed(1) + ' MW' }

const TICK = '#5f7688'
const GRID = 'rgba(96,190,255,0.06)'
const BASE: any = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } } }

function buildEnvelope() {
  envChart?.destroy()
  if (!envCanvas.value || !series.value.length) return
  const pts = series.value
  const step = Math.max(1, Math.floor(pts.length / 240))
  const s = pts.filter((_, i) => i % step === 0)
  envChart = new Chart(envCanvas.value, {
    type: 'line',
    data: {
      labels: s.map(p => p.ts.slice(5, 16).replace('T', ' ')),
      datasets: [
        { label: 'P10', data: s.map(p => p.p10 / 1000), borderColor: 'transparent', pointRadius: 0, fill: false },
        { label: 'P90', data: s.map(p => p.p90 / 1000), borderColor: 'transparent', backgroundColor: 'rgba(40,191,255,0.12)', pointRadius: 0, fill: '-1' },
        { label: 'P50', data: s.map(p => p.p50 / 1000), borderColor: 'rgba(40,191,255,0.95)', borderWidth: 1.5, pointRadius: 0, tension: 0.2, fill: false },
        { label: 'Cap', data: s.map(() => capacityKw.value / 1000), borderColor: 'rgba(120,140,156,0.3)', borderDash: [3, 4], borderWidth: 1, pointRadius: 0, fill: false },
      ],
    },
    options: { ...BASE, interaction: { mode: 'index', intersect: false }, scales: { x: { ticks: { color: TICK, font: { size: 9 }, maxTicksLimit: 14, maxRotation: 0 }, grid: { color: GRID } }, y: { ticks: { color: TICK, font: { size: 10 }, callback: (v: unknown) => Number(v).toFixed(0) + ' MW' }, grid: { color: GRID } } } },
  } as any)
}

function buildDiurnal() {
  diurnalChart?.destroy()
  if (!diurnalCanvas.value || !series.value.length) return
  const b = Array.from({ length: 24 }, () => ({ sum: 0, cnt: 0 }))
  for (const p of series.value) { const h = Number(p.ts.slice(11, 13)); b[h].sum += p.p50 / 1000; b[h].cnt++ }
  const avgs = b.map(x => x.cnt ? x.sum / x.cnt : 0)
  const capMw = capacityKw.value / 1000
  diurnalChart = new Chart(diurnalCanvas.value, {
    type: 'bar',
    data: {
      labels: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00'),
      datasets: [{ data: avgs, backgroundColor: avgs.map(v => v > capMw * 0.5 ? 'rgba(255,201,51,0.75)' : 'rgba(40,191,255,0.7)'), borderColor: 'transparent', borderRadius: 3 }],
    },
    options: { ...BASE, scales: { x: { ticks: { color: TICK, font: { size: 8 }, maxRotation: 0 }, grid: { color: GRID } }, y: { ticks: { color: TICK, font: { size: 10 }, callback: (v: unknown) => Number(v).toFixed(0) + ' MW' }, grid: { color: GRID } } } },
  })
}

function buildHistogram() {
  histChart?.destroy()
  if (!histCanvas.value || !series.value.length) return
  const vals = series.value.map(p => p.p50 / 1000)
  const min = Math.min(...vals), max = Math.max(...vals)
  const bins = 20, bw = (max - min) / bins || 1
  const counts = Array(bins).fill(0)
  for (const v of vals) counts[Math.min(bins - 1, Math.floor((v - min) / bw))]++
  histChart = new Chart(histCanvas.value, {
    type: 'bar',
    data: { labels: Array.from({ length: bins }, (_, i) => (min + i * bw).toFixed(1)), datasets: [{ data: counts, backgroundColor: 'rgba(40,191,255,0.65)', borderColor: 'rgba(40,191,255,0.9)', borderWidth: 1, borderRadius: 2 }] },
    options: { ...BASE, scales: { x: { ticks: { color: TICK, font: { size: 9 }, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: GRID } }, y: { ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } } } },
  })
}

function buildRamp() {
  rampChart?.destroy()
  if (!rampCanvas.value || !series.value.length) return
  const pts = series.value
  const ramps = pts.slice(1).map((p, i) => (p.p50 - pts[i].p50) / 1000)
  const step = Math.max(1, Math.floor(ramps.length / 200))
  const sr = ramps.filter((_, i) => i % step === 0)
  const labels = pts.filter((_, i) => i > 0 && (i - 1) % step === 0).map(p => p.ts.slice(11, 16))
  rampChart = new Chart(rampCanvas.value, {
    type: 'bar',
    data: { labels, datasets: [{ data: sr, backgroundColor: sr.map(v => v >= 0 ? 'rgba(102,211,110,0.65)' : 'rgba(255,112,67,0.65)'), borderColor: 'transparent', borderRadius: 2 }] },
    options: { ...BASE, scales: { x: { ticks: { color: TICK, font: { size: 9 }, maxTicksLimit: 12, maxRotation: 0 }, grid: { color: GRID } }, y: { ticks: { color: TICK, font: { size: 10 }, callback: (v: unknown) => Number(v).toFixed(1) + ' MW' }, grid: { color: GRID } } } },
  })
}

function buildWeather() {
  weatherChart?.destroy()
  if (!weatherCanvas.value || !series.value.length) return
  const step = Math.max(1, Math.floor(series.value.length / 300))
  const scatter = series.value.filter((_, i) => i % step === 0).map(p => ({ x: +p.driver.toFixed(1), y: +(p.p50 / 1000).toFixed(2) }))
  const xLabel = isWind.value ? 'm/s' : 'W/m²'
  weatherChart = new Chart(weatherCanvas.value, {
    type: 'scatter',
    data: { datasets: [{ data: scatter, backgroundColor: 'rgba(40,191,255,0.35)', pointRadius: 2.5 }] },
    options: { ...BASE, scales: { x: { ticks: { color: TICK, font: { size: 9 }, callback: (v: unknown) => Number(v).toFixed(0) + ' ' + xLabel }, grid: { color: GRID } }, y: { ticks: { color: TICK, font: { size: 10 }, callback: (v: unknown) => Number(v).toFixed(0) + ' MW' }, grid: { color: GRID } } } },
  })
}

function buildBandWidth() {
  bandChart?.destroy()
  if (!bandCanvas.value || !series.value.length) return
  const step = Math.max(1, Math.floor(series.value.length / 200))
  const s = series.value.filter((_, i) => i % step === 0)
  bandChart = new Chart(bandCanvas.value, {
    type: 'line',
    data: {
      labels: s.map(p => p.ts.slice(5, 16).replace('T', ' ')),
      datasets: [{ data: s.map(p => (p.p90 - p.p10) / 1000), borderColor: 'rgba(255,201,51,0.85)', backgroundColor: 'rgba(255,201,51,0.1)', borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true }],
    },
    options: { ...BASE, scales: { x: { ticks: { color: TICK, font: { size: 9 }, maxTicksLimit: 12, maxRotation: 0 }, grid: { color: GRID } }, y: { ticks: { color: TICK, font: { size: 10 }, callback: (v: unknown) => Number(v).toFixed(1) + ' MW' }, grid: { color: GRID } } } },
  } as any)
}

function destroyAll() {
  envChart?.destroy(); envChart = null
  diurnalChart?.destroy(); diurnalChart = null
  histChart?.destroy(); histChart = null
  rampChart?.destroy(); rampChart = null
  weatherChart?.destroy(); weatherChart = null
  bandChart?.destroy(); bandChart = null
}

async function renderAll() {
  await nextTick()
  buildEnvelope(); buildDiurnal(); buildHistogram(); buildRamp(); buildWeather(); buildBandWidth()
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
.ch-page { height: 100%; display: flex; flex-direction: column; gap: 10px; overflow: hidden; }

.ch-controls {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 14px; background: rgba(7,17,28,0.95);
  border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; flex-shrink: 0;
}
.ch-ctrl { display: flex; flex-direction: column; gap: 4px; }
.ch-ctrl__label { font-size: 8px; font-weight: 700; letter-spacing: 0.14em; color: var(--text-2); text-transform: uppercase; }
.ch-select { min-width: 180px; }
.ch-select-sm { min-width: 72px; }
.ch-kpi { display: flex; flex-direction: column; gap: 2px; padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
.ch-kpi__k { font-size: 8px; font-weight: 700; letter-spacing: 0.1em; color: var(--text-2); text-transform: uppercase; }
.ch-kpi__v { font-size: 11px; font-family: 'Menlo', monospace; color: var(--text-0); font-weight: 700; line-height: 1; }
.ch-loading-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--cyan); padding: 4px 10px; border: 1px solid rgba(40,191,255,0.3); border-radius: 8px; animation: pulse 1.5s infinite; }

.ch-grid {
  flex: 1; min-height: 0; display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas:
    'envelope envelope envelope'
    'diurnal  hist     ramp'
    'weather  band     band';
  gap: 10px;
}
.ch-panel--envelope { grid-area: envelope; }
.ch-panel--diurnal  { grid-area: diurnal; }
.ch-panel--hist     { grid-area: hist; }
.ch-panel--ramp     { grid-area: ramp; }
.ch-panel--weather  { grid-area: weather; }
.ch-panel--band     { grid-area: band; }

.ch-panel {
  background: rgba(7,17,28,0.95); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column;
  gap: 8px; min-height: 0; overflow: hidden; position: relative;
}
.ch-panel::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(40,191,255,0.45), transparent); }
.ch-hdr { display: flex; gap: 8px; align-items: baseline; flex-shrink: 0; }
.ch-title { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-2); }
.ch-sub { font-size: 8px; color: var(--text-2); opacity: 0.6; }
.ch-wrap { flex: 1; min-height: 0; position: relative; }
.ch-wrap :deep(canvas) { width: 100% !important; height: 100% !important; }

.ch-spinner { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: var(--text-2); text-align: center; padding: 40px; }
.ch-error { color: #ff7043; font-size: 12px; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

@media (max-width: 1024px) {
  .ch-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-areas: 'envelope envelope' 'diurnal hist' 'ramp weather' 'band band';
    grid-template-rows: repeat(4, minmax(140px, 1fr));
    overflow-y: auto;
  }
}
</style>

