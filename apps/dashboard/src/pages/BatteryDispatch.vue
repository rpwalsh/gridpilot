<template>
  <div class="bd-page">

    <!-- ── Control bar ── -->
    <div class="bd-controls">
      <label class="bd-ctrl">
        <span class="bd-ctrl__label">SITE</span>
        <select v-model="selectedSiteId" class="console-input bd-select">
          <option v-for="s in sites" :key="s.site_id" :value="s.site_id">{{ s.name }} ({{ s.asset_type }})</option>
        </select>
      </label>
      <label class="bd-ctrl">
        <span class="bd-ctrl__label">FORECAST</span>
        <select v-model="forecastMode" class="console-input bd-select">
          <option value="live">use live p50</option>
          <option value="manual">manual</option>
        </select>
      </label>
      <label class="bd-ctrl">
        <span class="bd-ctrl__label">SOC %</span>
        <input v-model.number="soc" type="number" min="0" max="100" class="console-input bd-num" />
      </label>
      <label class="bd-ctrl">
        <span class="bd-ctrl__label">PRICE $/MWh</span>
        <input v-model.number="price" type="number" min="0" class="console-input bd-num" />
      </label>
      <label class="bd-ctrl">
        <span class="bd-ctrl__label">SOLAR kW</span>
        <input v-model.number="solar" type="number" min="0" class="console-input bd-num" :disabled="forecastMode === 'live'" />
      </label>
      <label class="bd-ctrl">
        <span class="bd-ctrl__label">DEMAND kW</span>
        <input v-model.number="demand" type="number" min="0" class="console-input bd-num" />
      </label>
    </div>

    <!-- ── Signal strip ── -->
    <div class="bd-signals" v-if="result">
      <div class="bd-sig" :class="actionClass">
        <span class="bd-sig__key">ACTION</span>
        <span class="bd-sig__val">{{ result.action?.toUpperCase() ?? '—' }}</span>
      </div>
      <div class="bd-sig">
        <span class="bd-sig__key">NET $</span>
        <span class="bd-sig__val bd-sig__val--mono">{{ result.net_value_usd != null ? '$' + result.net_value_usd.toFixed(2) : '—' }}</span>
      </div>
      <div class="bd-sig">
        <span class="bd-sig__key">EST $</span>
        <span class="bd-sig__val bd-sig__val--mono">{{ result.estimated_value_usd != null ? '$' + result.estimated_value_usd.toFixed(2) : '—' }}</span>
      </div>
      <div class="bd-sig">
        <span class="bd-sig__key">SOC NOW</span>
        <span class="bd-sig__val bd-sig__val--mono">{{ result.current_soc_pct?.toFixed(1) ?? '—' }}%</span>
      </div>
      <div class="bd-sig">
        <span class="bd-sig__key">SOC TARGET</span>
        <span class="bd-sig__val bd-sig__val--mono">{{ result.target_soc_pct?.toFixed(1) ?? '—' }}%</span>
      </div>
      <div class="bd-sig">
        <span class="bd-sig__key">SOC Δ</span>
        <span class="bd-sig__val bd-sig__val--mono" :class="socDeltaClass">{{ socDelta }}</span>
      </div>
      <div class="bd-sig">
        <span class="bd-sig__key">WINDOW</span>
        <span class="bd-sig__val bd-sig__val--mono">{{ result.window_hours ?? 4 }}h</span>
      </div>
      <div class="bd-sig">
        <span class="bd-sig__key">PRICE</span>
        <span class="bd-sig__val bd-sig__val--mono">${{ price }}/MWh</span>
      </div>
    </div>

    <!-- ── Chart grid ── -->
    <div class="bd-grid" v-if="result">
      <!-- Timeline -->
      <div class="bd-panel bd-panel--timeline">
        <div class="bd-panel__hdr">
          <span class="bd-panel__title">DISPATCH TIMELINE</span>
          <span class="bd-panel__sub">{{ result.window_hours ?? 4 }}-HOUR WINDOW · SOC TRACK</span>
        </div>
        <div class="bd-chart-wrap">
          <canvas ref="timelineCanvas"></canvas>
        </div>
      </div>

      <!-- SoC arc -->
      <div class="bd-panel bd-panel--soc">
        <div class="bd-panel__hdr">
          <span class="bd-panel__title">STATE OF CHARGE</span>
          <span class="bd-panel__sub">CURRENT → TARGET</span>
        </div>
        <div class="bd-chart-wrap">
          <canvas ref="socCanvas"></canvas>
        </div>
      </div>

      <!-- Power balance -->
      <div class="bd-panel bd-panel--power">
        <div class="bd-panel__hdr">
          <span class="bd-panel__title">POWER BALANCE</span>
          <span class="bd-panel__sub">kW · INSTANTANEOUS</span>
        </div>
        <div class="bd-chart-wrap">
          <canvas ref="powerCanvas"></canvas>
        </div>
      </div>

      <!-- Value waterfall -->
      <div class="bd-panel bd-panel--value">
        <div class="bd-panel__hdr">
          <span class="bd-panel__title">VALUE STACK</span>
          <span class="bd-panel__sub">USD · {{ result.window_hours ?? 4 }}h WINDOW</span>
        </div>
        <div class="bd-chart-wrap">
          <canvas ref="valueCanvas"></canvas>
        </div>
      </div>
    </div>

    <div v-if="!result && !error" class="bd-loading">COMPUTING DISPATCH…</div>
    <p v-if="error" class="bd-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api, type SiteSummary, type DispatchResponse } from '../lib/api'

Chart.register(...registerables)

const sites = ref<SiteSummary[]>([])
const selectedSiteId = ref('')
const forecastMode = ref<'live' | 'manual'>('live')
const soc = ref(60)
const price = ref(85)
const solar = ref(500)
const demand = ref(300)
const result = ref<DispatchResponse | null>(null)
const error = ref('')

const timelineCanvas = ref<HTMLCanvasElement | null>(null)
const socCanvas = ref<HTMLCanvasElement | null>(null)
const powerCanvas = ref<HTMLCanvasElement | null>(null)
const valueCanvas = ref<HTMLCanvasElement | null>(null)

let timelineChart: Chart | null = null
let socChart: Chart | null = null
let powerChart: Chart | null = null
let valueChart: Chart | null = null

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 320 },
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
}

const GRID_COLOR = 'rgba(255,255,255,0.05)'
const TICK_COLOR = '#5f7688'

function destroyCharts() {
  timelineChart?.destroy(); timelineChart = null
  socChart?.destroy(); socChart = null
  powerChart?.destroy(); powerChart = null
  valueChart?.destroy(); valueChart = null
}

function buildTimeline(r: DispatchResponse) {
  if (!timelineCanvas.value) return
  timelineChart?.destroy()

  const hours = r.window_hours ?? 4
  const labels = Array.from({ length: hours + 1 }, (_, i) => `+${i}h`)
  const socStart = r.current_soc_pct
  const socEnd = r.target_soc_pct
  const socTrack = labels.map((_, i) => +(socStart + (socEnd - socStart) * (i / hours)).toFixed(1))

  // Derive dispatch kW from SoC delta (capacity = 4000 kWh)
  const capacityKwh = 4000
  const deltaKw = ((socEnd - socStart) / 100) * capacityKwh / hours
  const dispatchBars = Array.from({ length: hours }, () => +deltaKw.toFixed(1))
  const dispatchColor = deltaKw >= 0 ? 'rgba(40,191,255,0.75)' : 'rgba(255,201,51,0.75)'

  timelineChart = new Chart(timelineCanvas.value, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Dispatch kW',
          data: [...dispatchBars, null],
          backgroundColor: dispatchColor,
          borderRadius: 4,
          yAxisID: 'yPower',
          order: 2,
        },
        {
          type: 'line',
          label: 'SoC %',
          data: socTrack,
          borderColor: '#28bfff',
          backgroundColor: 'rgba(40,191,255,0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#28bfff',
          fill: true,
          tension: 0.35,
          yAxisID: 'ySoc',
          order: 1,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { ticks: { color: TICK_COLOR, font: { size: 10 } }, grid: { color: GRID_COLOR } },
        ySoc: {
          type: 'linear', position: 'left',
          min: 0, max: 100,
          ticks: { color: '#28bfff', font: { size: 10 }, callback: (v: unknown) => v + '%' },
          grid: { color: GRID_COLOR },
        },
        yPower: {
          type: 'linear', position: 'right',
          ticks: { color: TICK_COLOR, font: { size: 10 }, callback: (v: unknown) => v + ' kW' },
          grid: { display: false },
        },
      },
    },
  } as any)
}

function buildSoc(r: DispatchResponse) {
  if (!socCanvas.value) return
  socChart?.destroy()

  const cur = r.current_soc_pct
  const tgt = r.target_soc_pct
  const rem = 100

  socChart = new Chart(socCanvas.value, {
    type: 'doughnut',
    data: {
      labels: ['Current', 'Target Δ', 'Remaining'],
      datasets: [{
        data: [
          +cur.toFixed(1),
          +Math.abs(tgt - cur).toFixed(1),
          +(rem - Math.max(cur, tgt)).toFixed(1),
        ],
        backgroundColor: ['#28bfff', tgt >= cur ? 'rgba(102,211,110,0.8)' : 'rgba(255,201,51,0.8)', 'rgba(255,255,255,0.04)'],
        borderColor: ['#28bfff', tgt >= cur ? '#66d36e' : '#ffc933', 'rgba(255,255,255,0.08)'],
        borderWidth: 1,
        hoverOffset: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      cutout: '68%',
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: TICK_COLOR, font: { size: 10 }, boxWidth: 10, padding: 10 } },
        tooltip: { enabled: true },
      },
    },
  })
}

function buildPower(r: DispatchResponse) {
  if (!powerCanvas.value) return
  powerChart?.destroy()

  const solarKw = solar.value
  const demandKw = demand.value
  const net = solarKw - demandKw

  powerChart = new Chart(powerCanvas.value, {
    type: 'bar',
    data: {
      labels: ['SOLAR', 'DEMAND', 'NET'],
      datasets: [{
        data: [solarKw, demandKw, net],
        backgroundColor: ['rgba(255,201,51,0.75)', 'rgba(255,112,67,0.75)', net >= 0 ? 'rgba(102,211,110,0.75)' : 'rgba(255,138,138,0.75)'],
        borderColor: ['#ffc933', '#ff7043', net >= 0 ? '#66d36e' : '#ff8a8a'],
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y',
      scales: {
        x: { ticks: { color: TICK_COLOR, font: { size: 10 }, callback: (v: unknown) => v + ' kW' }, grid: { color: GRID_COLOR } },
        y: { ticks: { color: '#e6f4ff', font: { size: 10, weight: 'bold' } }, grid: { display: false } },
      },
    },
  })
}

function buildValue(r: DispatchResponse) {
  if (!valueCanvas.value) return
  valueChart?.destroy()

  const est = r.estimated_value_usd ?? 0
  const net = r.net_value_usd ?? 0
  const cost = est - net

  valueChart = new Chart(valueCanvas.value, {
    type: 'bar',
    data: {
      labels: ['GROSS', 'COST', 'NET'],
      datasets: [{
        data: [est, cost, net],
        backgroundColor: ['rgba(40,191,255,0.7)', 'rgba(255,112,67,0.7)', net >= 0 ? 'rgba(102,211,110,0.75)' : 'rgba(255,138,138,0.75)'],
        borderColor: ['#28bfff', '#ff7043', net >= 0 ? '#66d36e' : '#ff8a8a'],
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { ticks: { color: TICK_COLOR, font: { size: 10 } }, grid: { color: GRID_COLOR } },
        y: { ticks: { color: TICK_COLOR, font: { size: 10 }, callback: (v: unknown) => '$' + v }, grid: { color: GRID_COLOR } },
      },
    },
  })
}

async function renderCharts() {
  if (!result.value) return
  await nextTick()
  const r = result.value
  buildTimeline(r)
  buildSoc(r)
  buildPower(r)
  buildValue(r)
}

// ── Computed signals ──────────────────────────────────────────────────────────
const actionClass = computed(() => {
  const a = result.value?.action?.toLowerCase()
  if (a === 'discharge') return 'bd-sig--yellow'
  if (a === 'charge') return 'bd-sig--cyan'
  return 'bd-sig--dim'
})

const socDelta = computed(() => {
  if (!result.value) return '—'
  const d = (result.value.target_soc_pct ?? 0) - (result.value.current_soc_pct ?? 0)
  return (d >= 0 ? '+' : '') + d.toFixed(1) + '%'
})

const socDeltaClass = computed(() => {
  if (!result.value) return ''
  const d = (result.value.target_soc_pct ?? 0) - (result.value.current_soc_pct ?? 0)
  return d >= 0 ? 'bd-sig__val--green' : 'bd-sig__val--yellow'
})

// ── API logic ─────────────────────────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function getLiveForecastKw(): Promise<number | null> {
  const site = sites.value.find(s => s.site_id === selectedSiteId.value)
  if (!site) return null
  const isWind = site.asset_type === 'wind'
  const wind = site.wind_speed_mps ?? undefined
  const ghi = site.ghi_wm2 ?? undefined
  if ((isWind && wind == null) || (!isWind && ghi == null)) return null
  const fc = await api.forecastSite({
    site_id: site.site_id,
    asset_type: isWind ? 'wind_turbine' : 'solar_inverter',
    capacity_kw: isWind ? 100_000 : 50_000,
    wind_speed_mps: wind,
    ghi_wm2: ghi,
    temperature_c: site.temperature_c ?? 20,
  })
  return fc.p50_kw
}

async function optimize() {
  error.value = ''
  try {
    let forecastSolarKw = solar.value
    if (forecastMode.value === 'live') {
      const maybeForecast = await getLiveForecastKw()
      if (maybeForecast == null) {
        error.value = 'Live forecast unavailable; switch to manual mode.'
        return
      }
      forecastSolarKw = maybeForecast
    }
    result.value = await api.dispatchOptimize({
      battery_id: 'demo_battery_01',
      current_soc_pct: soc.value,
      capacity_kwh: 4000,
      forecast_solar_kw: forecastSolarKw,
      forecast_demand_kw: demand.value,
      price_per_mwh: price.value,
      window_hours: 4,
    })
    await renderCharts()
  } catch {
    error.value = 'Dispatch optimization failed'
  }
}

function scheduleOptimize() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(optimize, 400)
}

watch([selectedSiteId, forecastMode, soc, price, solar, demand], scheduleOptimize)

async function loadSites() {
  try {
    const summary = await api.sourceSummary()
    sites.value = summary.sites
    if (sites.value.length > 0) selectedSiteId.value = sites.value[0].site_id
  } catch {
    // manual mode still works
  }
}

onMounted(loadSites)
onBeforeUnmount(destroyCharts)
</script>

<style scoped>
.bd-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  padding: 0;
}

/* ── Controls ── */
.bd-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-end;
  padding: 10px 14px;
  background: rgba(7, 17, 28, 0.95);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  flex-shrink: 0;
}

.bd-ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bd-ctrl__label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text-2);
  text-transform: uppercase;
}

.bd-select { min-width: 160px; }
.bd-num { width: 90px; }

/* ── Signal strip ── */
.bd-signals {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.bd-sig {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 12px;
  border-radius: 10px;
  background: rgba(7, 17, 28, 0.95);
  border: 1px solid rgba(255,255,255,0.06);
  min-width: 72px;
}

.bd-sig--cyan  { border-color: rgba(40,191,255,0.4); background: rgba(40,191,255,0.07); }
.bd-sig--yellow { border-color: rgba(255,201,51,0.4); background: rgba(255,201,51,0.07); }
.bd-sig--dim   { border-color: rgba(255,255,255,0.06); }

.bd-sig__key {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-2);
  text-transform: uppercase;
}

.bd-sig__val {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-0);
  line-height: 1;
}

.bd-sig__val--mono { font-family: 'Menlo', monospace; font-size: 11px; }
.bd-sig__val--green { color: #69e3aa; }
.bd-sig__val--yellow { color: #ffc933; }

/* ── Chart grid ── */
.bd-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1.4fr) minmax(0, 1fr);
  grid-template-areas:
    'timeline soc'
    'power    value';
  gap: 10px;
}

.bd-panel--timeline { grid-area: timeline; }
.bd-panel--soc      { grid-area: soc; }
.bd-panel--power    { grid-area: power; }
.bd-panel--value    { grid-area: value; }

.bd-panel {
  background: rgba(7, 17, 28, 0.95);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.bd-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(40,191,255,0.5), transparent);
}

.bd-panel__hdr {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-shrink: 0;
}

.bd-panel__title {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-2);
}

.bd-panel__sub {
  font-size: 8px;
  color: var(--text-2);
  opacity: 0.6;
  letter-spacing: 0.06em;
}

.bd-chart-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}

.bd-chart-wrap :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
}

.bd-loading {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--text-2);
  text-align: center;
  padding: 40px 0;
}

.bd-error { color: #ff7043; font-size: 12px; padding: 8px 0; }

@media (max-width: 900px) {
  .bd-grid {
    grid-template-columns: 1fr;
    grid-template-areas: 'timeline' 'soc' 'power' 'value';
    grid-template-rows: repeat(4, minmax(160px, 1fr));
    overflow-y: auto;
  }
}
</style>
