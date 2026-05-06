<template>
  <section class="page-grid">
    <div class="page-header">
      <h1>Charts</h1>
      <button class="nav-link" @click="load">Refresh</button>
    </div>
    <article class="glass-panel panel cards">
      <div v-for="item in chartCatalog" :key="item.id" class="glass-panel mini-card">
        <p class="section-label">{{ item.group }}</p>
        <h3>{{ item.name }}</h3>
        <p>{{ item.desc }}</p>
      </div>
    </article>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import type { ChartCatalogItem, ChartsCatalogResponse } from '../lib/api-types'

const fixtureCatalog: ChartCatalogItem[] = [
  { id: 'solar-generation', group: 'Solar', name: 'Daily Generation Trend', desc: 'Longitudinal output profile with seasonal overlays.' },
  { id: 'solar-efficiency', group: 'Solar', name: 'Panel Efficiency', desc: 'Efficiency line tracking against weather and heat drift.' },
  { id: 'wind-speed', group: 'Wind', name: 'Wind Speed Correlation', desc: 'Comparative wind speed and output relationship.' },
  { id: 'portfolio-mix', group: 'Portfolio', name: 'Monthly Generation Mix', desc: 'Stacked contribution by source across month buckets.' },
]

const chartCatalog = ref<ChartCatalogItem[]>(fixtureCatalog)
const error = ref('')

async function load() {
  error.value = ''
  try {
    const response = await axios.get<ChartsCatalogResponse>('/api/v1/charts/catalog')
    if (response.data?.charts?.length) {
      chartCatalog.value = response.data.charts
    }
  } catch {
    error.value = 'Chart catalog unavailable - showing fixture data'
    chartCatalog.value = fixtureCatalog
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

h3 { margin: 4px 0; }
p { color: #91a8b8; margin: 0; }
.panel { padding: 14px; }
.cards { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.mini-card { padding: 12px; border-radius: 12px; }
.error { color: #ffbe3c; }
</style>
