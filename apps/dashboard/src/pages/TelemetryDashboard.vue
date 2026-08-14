<template>
  <section class="page-grid">
    <div class="page-header">
      <h1>Telemetry Dashboard</h1>
      <div class="controls">
        <select v-model="siteId" class="console-input">
          <option v-for="site in availableSites" :key="site" :value="site">{{ site }}</option>
        </select>
        <select v-model="dataMode" class="console-input">
          <option value="source">source</option>
          <option value="live">live</option>
        </select>
        <button class="nav-link" @click="fetchTelemetry">Refresh</button>
      </div>
    </div>

    <article class="glass-panel panel">
      <p class="section-label">Assets</p>
      <p v-if="error" class="muted">{{ error }}</p>
      <table class="table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Power kW</th>
            <th>Expected kW</th>
            <th>Residual %</th>
            <th>Availability %</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="asset in assets" :key="asset.asset_id">
            <td>{{ asset.asset_id }}</td>
            <td>{{ asset.asset_type }}</td>
            <td>{{ num(asset.power_kw) }}</td>
            <td>{{ num(asset.expected_power_kw) }}</td>
            <td>{{ residual(asset) }}</td>
            <td>{{ num(asset.availability_pct) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!assets.length" class="muted">No telemetry records for this site.</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { api } from '../lib/api'

type AssetSnapshot = {
  asset_id: string
  asset_type: string
  power_kw?: number
  expected_power_kw?: number
  availability_pct?: number
}

const siteId = ref('solar_nrel_golden_1')
const dataMode = ref<'source' | 'live'>('source')
const availableSites = ref<string[]>(['solar_nrel_golden_1'])
const assets = ref<AssetSnapshot[]>([])
const error = ref('')

function num(value?: number) {
  return value == null ? 'n/a' : value.toFixed(2)
}

function residual(asset: AssetSnapshot) {
  if (asset.power_kw == null || asset.expected_power_kw == null || asset.expected_power_kw === 0) {
    return 'n/a'
  }
  const pct = ((asset.power_kw - asset.expected_power_kw) / asset.expected_power_kw) * 100
  return `${pct.toFixed(1)}%`
}

async function fetchTelemetry() {
  error.value = ''
  try {
    const response = await axios.get(`/api/v1/sites/${siteId.value}/telemetry/latest?data_mode=${dataMode.value}`)
    assets.value = response.data?.assets ?? []
    if (Array.isArray(response.data?.available_sites) && response.data.available_sites.length > 0) {
      availableSites.value = response.data.available_sites
      if (!availableSites.value.includes(siteId.value)) {
        siteId.value = availableSites.value[0]
      }
    }
  } catch (caught: any) {
    assets.value = []
    error.value = caught?.response?.data?.detail ?? 'Telemetry unavailable'
  }
}

async function initSites() {
  try {
    const summary = await api.sourceSummary()
    if (summary.sites.length > 0) {
      availableSites.value = summary.sites.map(s => s.site_id)
      siteId.value = availableSites.value[0]
    }
  } catch {
    // Keep fallback defaults
  }
}

onMounted(async () => {
  await initSites()
  await fetchTelemetry()
})
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
.page-header { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.controls { display: flex; gap: 8px; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
.muted { color: #91a8b8; }
</style>
