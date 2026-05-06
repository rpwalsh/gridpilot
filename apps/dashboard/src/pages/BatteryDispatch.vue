<template>
  <section class="page-grid">
    <h1>Battery Dispatch</h1>

    <article class="glass-panel panel form-grid">
      <label>Forecast Site
        <select v-model="selectedSiteId" class="console-input">
          <option v-for="s in sites" :key="s.site_id" :value="s.site_id">{{ s.name }} ({{ s.asset_type }})</option>
        </select>
      </label>
      <label>Live Forecast
        <select v-model="forecastMode" class="console-input">
          <option value="live">use live p50</option>
          <option value="manual">manual solar input</option>
        </select>
      </label>
      <label>SoC %<input v-model.number="soc" type="number" class="console-input" /></label>
      <label>Price $/MWh<input v-model.number="price" type="number" class="console-input" /></label>
      <label>Solar kW<input v-model.number="solar" type="number" class="console-input" /></label>
      <label>Demand kW<input v-model.number="demand" type="number" class="console-input" /></label>
      <button class="nav-link" @click="optimize">Analyze</button>
    </article>

    <article v-if="liveForecastKw != null" class="glass-panel panel">
      <p class="section-label">Live Forecast Input</p>
      <p class="muted">Using {{ Math.round(liveForecastKw).toLocaleString() }} kW from model p50 for dispatch optimization.</p>
    </article>

    <article v-if="result" class="glass-panel panel">
      <p class="section-label">Action</p>
      <p class="metric-value">{{ result.action?.toUpperCase() }}</p>
      <p class="muted">Net Value: {{ result.net_value_usd?.toFixed(2) }}</p>
      <ul>
        <li v-for="(line, idx) in reasoningLines" :key="idx">{{ line }}</li>
      </ul>
    </article>

    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api, type SiteSummary } from '../lib/api'

type DispatchResponse = {
  action?: string
  net_value_usd?: number
  reasoning?: string | string[]
}

const sites = ref<SiteSummary[]>([])
const selectedSiteId = ref('')
const forecastMode = ref<'live' | 'manual'>('live')
const soc = ref(60)
const price = ref(85)
const solar = ref(500)
const demand = ref(300)
const liveForecastKw = ref<number | null>(null)
const result = ref<DispatchResponse | null>(null)
const error = ref('')
const reasoningLines = computed(() => {
  const reasoning = result.value?.reasoning
  if (Array.isArray(reasoning)) return reasoning
  if (typeof reasoning === 'string' && reasoning.trim().length > 0) return [reasoning]
  return []
})

async function loadSites() {
  try {
    const summary = await api.sourceSummary()
    sites.value = summary.sites
    if (sites.value.length > 0) {
      selectedSiteId.value = sites.value[0].site_id
    }
  } catch {
    // Keep page usable with manual mode only.
  }
}

async function getLiveForecastKw() {
  const site = sites.value.find(s => s.site_id === selectedSiteId.value)
  if (!site) return null

  const isWind = site.asset_type === 'wind'
  const wind = site.wind_speed_mps ?? undefined
  const ghi = site.ghi_wm2 ?? undefined

  if ((isWind && wind == null) || (!isWind && ghi == null)) {
    return null
  }

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
  result.value = null
  liveForecastKw.value = null
  try {
    let forecastSolarKw = solar.value
    if (forecastMode.value === 'live') {
      const maybeForecast = await getLiveForecastKw()
      if (maybeForecast == null) {
        error.value = 'Live forecast unavailable for selected site; switch to manual mode or choose another site.'
        return
      }
      liveForecastKw.value = maybeForecast
      forecastSolarKw = maybeForecast
    }

    const response = await api.dispatchOptimize({
      battery_id: 'demo_battery_01',
      current_soc_pct: soc.value,
      capacity_kwh: 4000,
      forecast_solar_kw: forecastSolarKw,
      forecast_demand_kw: demand.value,
      price_per_mwh: price.value,
      window_hours: 4,
    })
    result.value = response
  } catch {
    error.value = 'Dispatch optimization failed'
  }
}

onMounted(loadSites)
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; align-items: end; }
label { display: grid; gap: 6px; color: #91a8b8; }
.muted { color: #91a8b8; }
.error { color: #ff7043; }
</style>
