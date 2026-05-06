<template>
  <section class="page-grid">
    <div class="page-header">
      <h1>Pipeline State</h1>
      <button class="nav-link" @click="fetchState">Poll</button>
    </div>

    <article class="glass-panel panel">
      <table class="table">
        <thead>
          <tr>
            <th>Connector</th>
            <th>Protocol</th>
            <th>State</th>
            <th>Samples</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in connectors" :key="row.connector">
            <td>{{ row.connector }}</td>
            <td>{{ row.protocol }}</td>
            <td>{{ row.state }}</td>
            <td>{{ row.sample_count ?? '-' }}</td>
            <td>{{ row.error ?? '-' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="timestamp" class="muted">Polled UTC: {{ timestamp }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

type ConnectorRow = {
  connector: string
  protocol: string
  state: string
  sample_count?: number
  error?: string | null
}

const connectors = ref<ConnectorRow[]>([])
const timestamp = ref('')
const error = ref('')

async function fetchState() {
  error.value = ''
  try {
    const response = await axios.get('/api/v1/connectors/state')
    connectors.value = response.data?.connectors ?? []
    timestamp.value = response.data?.timestamp_utc ?? ''
  } catch {
    error.value = 'Could not reach API'
  }
}

onMounted(fetchState)
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
.error { color: #ff7043; }
.muted { color: #91a8b8; }
</style>
