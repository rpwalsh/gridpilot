<template>
  <section class="page-grid">
    <h1>Generation Forecast</h1>

    <article class="glass-panel panel form-grid">
      <label>
        Asset Type
        <select v-model="assetType" class="console-input">
          <option value="wind_turbine">wind_turbine</option>
          <option value="solar_inverter">solar_inverter</option>
        </select>
      </label>
      <label>
        Capacity kW
        <input v-model.number="capacity" type="number" class="console-input" />
      </label>
      <label v-if="assetType === 'wind_turbine'">
        Wind Speed m/s
        <input v-model.number="windSpeed" type="number" class="console-input" />
      </label>
      <label v-else>
        GHI W/m2
        <input v-model.number="ghi" type="number" class="console-input" />
      </label>
      <button class="nav-link" @click="runForecast">Run</button>
    </article>

    <article v-if="result" class="glass-panel panel">
      <div class="results-grid">
        <StatCard label="P10" :value="Math.round(result.p10_kw) + ' kW'" />
        <StatCard label="P50" :value="Math.round(result.p50_kw) + ' kW'" />
        <StatCard label="P90" :value="Math.round(result.p90_kw) + ' kW'" />
        <StatCard label="Band" :value="Math.round(result.p90_kw - result.p10_kw) + ' kW'" />
      </div>
      <Bar :data="chartData!" :options="chartOptions" class="chart" />
    </article>

    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import StatCard from '../components/StatCard.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type ForecastResult = { p10_kw: number; p50_kw: number; p90_kw: number }

const assetType = ref<'wind_turbine' | 'solar_inverter'>('wind_turbine')
const capacity = ref(2000)
const windSpeed = ref(8)
const ghi = ref(700)
const result = ref<ForecastResult | null>(null)
const error = ref('')

async function runForecast() {
  error.value = ''
  result.value = null
  try {
    const payload: Record<string, number | string> = {
      site_id: 'demo_site',
      asset_type: assetType.value,
      capacity_kw: capacity.value,
    }
    if (assetType.value === 'wind_turbine') payload.wind_speed_mps = windSpeed.value
    if (assetType.value === 'solar_inverter') {
      payload.ghi_wm2 = ghi.value
      payload.temperature_c = 25
    }
    const response = await axios.post('/api/v1/forecasts/site', payload)
    result.value = response.data
  } catch {
    error.value = 'Forecast unavailable'
  }
}

const chartData = computed(() => {
  if (!result.value) return null
  return {
    labels: ['P10', 'P50', 'P90'],
    datasets: [{
      label: 'kW',
      data: [result.value.p10_kw, result.value.p50_kw, result.value.p90_kw],
      backgroundColor: [
        'rgba(80, 190, 255, 0.5)',
        'rgba(80, 190, 255, 0.8)',
        'rgba(80, 190, 255, 0.5)',
      ],
    }],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#91a8b8' }, grid: { color: 'rgba(80,190,255,0.08)' } },
    y: { ticks: { color: '#91a8b8' }, grid: { color: 'rgba(80,190,255,0.08)' } },
  },
}
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; align-items: end; }
label { display: grid; gap: 6px; color: #91a8b8; }
.results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 14px; }
.chart { height: 220px; }
.error { color: #ff7043; }
</style>
