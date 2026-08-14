<template>
  <section class="page-grid">
    <div class="page-header">
      <h1>Provider Status</h1>
      <button class="nav-link" @click="fetchHealth">Refresh</button>
    </div>

    <article class="glass-panel panel">
      <table class="table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Status</th>
            <th>Latency</th>
            <th>Mode</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.provider">
            <td>{{ row.provider }}</td>
            <td>{{ row.status }}</td>
            <td>{{ row.latency }}</td>
            <td>{{ row.mode }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="error" class="error">{{ error }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import type { ProviderHealthResponse } from '../lib/api-types'

const rows = ref<Array<{ provider: string; status: string; latency: string; mode: string }>>([])
const error = ref('')

async function fetchHealth() {
  error.value = ''
  try {
    const response = await axios.get<ProviderHealthResponse>('/api/v1/providers/health')
    const providers = response.data?.providers ?? {}
    rows.value = Object.entries(providers).map(([provider, info]) => ({
      provider,
      status: (info?.status ?? 'unknown').replace(/_/g, ' '),
      latency: info?.latency_ms != null ? `${info.latency_ms} ms` : 'n/a',
      mode: info?.degraded_mode ?? '-',
    }))
  } catch {
    error.value = 'Source status unavailable'
    rows.value = []
  }
}

onMounted(fetchHealth)
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
.error { color: #ff7043; }
</style>
