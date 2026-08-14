<template>
  <section class="page-grid">
    <div class="page-header">
      <h1>Sources</h1>
      <button class="nav-link" @click="load">Refresh</button>
    </div>
    <article class="glass-panel panel">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Provider</th>
            <th>Type</th>
            <th>Coverage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="source in sources" :key="source.id">
            <td>{{ source.name }}</td>
            <td>{{ source.provider }}</td>
            <td>{{ source.type }}</td>
            <td>{{ source.coverage }}</td>
            <td><StatusBadge :status="source.status" /></td>
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
import StatusBadge from '../components/StatusBadge.vue'
import type { SourceItem, SourcesResponse } from '../lib/api-types'

const sources = ref<SourceItem[]>([])
const error = ref('')

async function load() {
  error.value = ''
  try {
    const response = await axios.get<SourcesResponse>('/api/v1/sources')
    if (response.data?.sources?.length) {
      sources.value = response.data.sources
    }
  } catch {
    error.value = 'Source catalog unavailable'
    sources.value = []
  }
}

onMounted(load)
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
h1 {
  margin: 0;
  font-size: 28px;
}

.panel { padding: 14px; }
.table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
.error { color: #ffbe3c; margin-top: 10px; }
</style>
