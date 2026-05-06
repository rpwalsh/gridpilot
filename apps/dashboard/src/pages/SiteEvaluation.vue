<template>
  <section class="page-grid">
    <h1>Site Evaluation</h1>

    <article class="glass-panel panel form-grid">
      <label>Site Name<input v-model="form.name" class="console-input" /></label>
      <label>Latitude<input v-model.number="form.latitude" type="number" class="console-input" /></label>
      <label>Longitude<input v-model.number="form.longitude" type="number" class="console-input" /></label>
      <label>Asset Type
        <select v-model="form.asset_type" class="console-input">
          <option value="solar">solar</option>
          <option value="wind">wind</option>
          <option value="wind_solar">wind_solar</option>
          <option value="solar_bess">solar_bess</option>
          <option value="bess">bess</option>
        </select>
      </label>
      <label>Capacity MW<input v-model.number="form.capacity_mw" type="number" class="console-input" /></label>
      <label>Window Hours<input v-model.number="form.window_hours" type="number" class="console-input" /></label>
      <button class="nav-link" @click="run">Analyze Snapshot</button>
    </article>

    <article v-if="result" class="glass-panel panel results-grid">
      <div><p class="section-label">P10</p><p class="metric-value">{{ result.p10_mwh }} MWh</p></div>
      <div><p class="section-label">P50</p><p class="metric-value">{{ result.p50_mwh }} MWh</p></div>
      <div><p class="section-label">P90</p><p class="metric-value">{{ result.p90_mwh }} MWh</p></div>
      <div><p class="section-label">Trust</p><p class="metric-value">{{ Math.round((result.forecast_trust_score ?? 0) * 100) }}%</p></div>
    </article>

    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../lib/api-types'

type SiteEvaluationResponse = {
  p10_mwh: number
  p50_mwh: number
  p90_mwh: number
  forecast_trust_score?: number
}

const form = ref({
  name: 'north_ridge_solar',
  latitude: 44.9537,
  longitude: -93.09,
  asset_type: 'solar',
  capacity_mw: 50,
  window_hours: 24,
  data_mode: 'live',
  grid_demand_mw: 28000,
  forecast_residual_pct: -8.5,
  current_soc_pct: 72,
  price_per_mwh: 55,
})

const result = ref<SiteEvaluationResponse | null>(null)
const error = ref('')

async function run() {
  error.value = ''
  result.value = null
  try {
    const response = await axios.post<SiteEvaluationResponse>('/api/v1/sites/evaluate', form.value)
    result.value = response.data
  } catch (caught) {
    const err = caught as AxiosError<ApiErrorResponse>
    error.value = err.response?.data?.detail ?? 'Evaluation failed'
  }
}
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; align-items: end; }
label { display: grid; gap: 6px; color: #91a8b8; }
.results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.error { color: #ff7043; }
</style>
