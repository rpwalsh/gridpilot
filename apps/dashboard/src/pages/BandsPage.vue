<template>
  <section class="page-grid">
    <h1>Bands</h1>

    <article class="glass-panel panel">
      <p class="section-label">Confidence Bands</p>
      <Bar :data="chartData" :options="chartOptions" class="chart" />
    </article>

    <article class="glass-panel panel">
      <table class="table">
        <thead>
          <tr>
            <th>Bucket</th>
            <th>P10</th>
            <th>P50</th>
            <th>P90</th>
            <th>Actual</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.bucket">
            <td>{{ row.bucket }}</td>
            <td>{{ row.p10 }}</td>
            <td>{{ row.p50 }}</td>
            <td>{{ row.p90 }}</td>
            <td>{{ row.actual }}</td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const rows = ['H+1', 'H+2', 'H+3', 'H+4', 'H+5', 'H+6'].map((bucket, i) => {
  const p50 = 420 + i * 22
  return { bucket, p10: Math.round(p50 * 0.84), p50, p90: Math.round(p50 * 1.18), actual: Math.round(p50 * (0.95 + i * 0.01)) }
})

const chartData = {
  labels: rows.map(r => r.bucket),
  datasets: [
    { label: 'P10', data: rows.map(r => r.p10), backgroundColor: 'rgba(80,190,255,0.3)' },
    { label: 'P50', data: rows.map(r => r.p50), backgroundColor: 'rgba(80,190,255,0.75)' },
    { label: 'P90', data: rows.map(r => r.p90), backgroundColor: 'rgba(80,190,255,0.3)' },
    { label: 'Actual', data: rows.map(r => r.actual), backgroundColor: 'rgba(70,220,130,0.7)' },
  ],
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#c5daea' } } },
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
.chart { height: 240px; }
.table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
</style>
