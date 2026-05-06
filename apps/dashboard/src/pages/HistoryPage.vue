<template>
  <section class="page-grid">
    <div class="page-header">
      <h1>History</h1>
      <div class="controls">
        <label>Site
          <input v-model="siteId" class="console-input" placeholder="demo_site" />
        </label>
        <button class="nav-link" @click="load">Load</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <article class="glass-panel panel">
      <table class="table">
        <thead>
          <tr>
            <th>Timestamp UTC</th>
            <th>Power kW</th>
            <th>Irradiance</th>
            <th>Temperature C</th>
            <th>Wind m/s</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.timestamp">
            <td>{{ row.timestamp }}</td>
            <td>{{ row.power }}</td>
            <td>{{ row.irradiance }}</td>
            <td>{{ row.temperature }}</td>
            <td>{{ row.wind }}</td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

type HistoryRow = { timestamp: string; power: string; irradiance: string; temperature: string; wind: string }

const siteId = ref('demo_site')
const error = ref('')
const rows = ref<HistoryRow[]>([])

async function load() {
  error.value = ''
  try {
    const resp = await axios.get<{ rows?: HistoryRow[] }>(`/api/v1/sites/${siteId.value}/history`)
    if (resp.data?.rows?.length) rows.value = resp.data.rows
  } catch {
    error.value = 'History unavailable'
    rows.value = []
  }
}

onMounted(load)
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
.page-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
h1 { margin: 0; font-size: 28px; }
.controls { display: flex; gap: 10px; align-items: end; }
label { display: grid; gap: 4px; font-size: 13px; color: #91a8b8; }
.panel { padding: 14px; }
.table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
.error { color: #ffbe3c; font-size: 13px; }
</style>
