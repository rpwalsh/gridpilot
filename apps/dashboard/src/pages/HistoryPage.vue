<template>
  <section class="page-grid">
    <div class="page-header">
      <h1>History</h1>
      <div class="controls">
        <label>Site
          <select v-model="selectedSiteId" class="console-input">
            <option v-for="s in sites" :key="s.site_id" :value="s.site_id">{{ s.name }} ({{ s.asset_type }})</option>
          </select>
        </label>
        <label>Hours
          <select v-model.number="hours" class="console-input">
            <option :value="24">24 h</option>
            <option :value="48">48 h</option>
            <option :value="72">72 h</option>
            <option :value="168">7 d</option>
            <option :value="336">14 d</option>
          </select>
        </label>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="loading">Loading timeseries data…</div>

    <article v-if="!loading && rows.length" class="glass-panel panel">
      <table class="table">
        <thead>
          <tr>
            <th>Timestamp UTC</th>
            <th>Temp °C</th>
            <th>Wind 10m</th>
            <th>Wind 80m</th>
            <th>GHI W/m²</th>
            <th>DNI W/m²</th>
            <th>Clouds %</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.ts">
            <td>{{ row.ts }}</td>
            <td>{{ row.temperature_2m?.toFixed(1) ?? '—' }}</td>
            <td>{{ row.wind_speed_10m?.toFixed(1) ?? '—' }}</td>
            <td>{{ row.wind_speed_80m?.toFixed(1) ?? '—' }}</td>
            <td>{{ row.shortwave_radiation?.toFixed(0) ?? '—' }}</td>
            <td>{{ row.direct_normal_irradiance?.toFixed(0) ?? '—' }}</td>
            <td>{{ row.cloud_cover?.toFixed(0) ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api, type SiteSummary, type TimeseriesRow } from '../lib/api'

const sites = ref<SiteSummary[]>([])
const selectedSiteId = ref('')
const hours = ref(72)
const loading = ref(false)
const error = ref('')
const rows = ref<TimeseriesRow[]>([])

async function loadData() {
  if (!selectedSiteId.value) return
  loading.value = true
  error.value = ''
  try {
    const ts = await api.timeseries(selectedSiteId.value, hours.value)
    rows.value = ts.rows
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load timeseries'
    rows.value = []
  } finally {
    loading.value = false
  }
}

watch([selectedSiteId, hours], loadData)

onMounted(async () => {
  try {
    const summary = await api.sourceSummary()
    sites.value = summary.sites
    if (summary.sites.length) selectedSiteId.value = summary.sites[0].site_id
  } catch {
    error.value = 'Failed to load sites'
  }
})
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
.page-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
h1 { margin: 0; font-size: 28px; }
.controls { display: flex; gap: 10px; align-items: end; }
label { display: grid; gap: 4px; font-size: 13px; color: #91a8b8; }
select { padding: 6px 10px; background: rgba(8,26,42,0.8); color: #e6f4ff; border: 1px solid rgba(40,191,255,0.2); border-radius: 6px; font-size: 12px; }
.panel { padding: 14px; }
.table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
th { font-weight: 700; color: #91a8b8; }
.error { color: #ffbe3c; font-size: 13px; }
.loading { text-align: center; padding: 20px; color: #91a8b8; font-size: 12px; }
</style>

