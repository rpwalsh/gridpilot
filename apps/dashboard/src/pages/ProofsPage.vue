<template>
  <section class="page-grid">
    <h1>Proofs</h1>

    <div class="stats-grid">
      <StatCard label="Coverage" :value="Math.round(result.metrics.coverage_rate * 100) + '%'" />
      <StatCard label="MAE" :value="result.metrics.mae" />
      <StatCard label="RMSE" :value="result.metrics.rmse" />
      <StatCard label="MAPE" :value="result.metrics.mape + '%'" />
    </div>

    <article class="glass-panel panel">
      <p class="section-label">P50 vs Actual — 2025 Holdout</p>
      <Bar :data="chartData" :options="chartOptions" class="chart" />
    </article>

    <article class="glass-panel panel">
      <p class="section-label">2025 Holdout</p>
      <table class="table">
        <thead>
          <tr>
            <th>Month</th>
            <th>P10</th>
            <th>P50</th>
            <th>P90</th>
            <th>Actual</th>
            <th>Residual</th>
            <th>In Band</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in result.monthly_2025" :key="row.month">
            <td>{{ row.month }}</td>
            <td>{{ row.p10 }}</td>
            <td>{{ row.p50 }}</td>
            <td>{{ row.p90 }}</td>
            <td>{{ row.actual }}</td>
            <td>{{ row.residual }}</td>
            <td><StatusBadge :status="row.in_band ? 'ok' : 'bad'" :label="row.in_band ? 'yes' : 'no'" /></td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { generateProofResult } from '../lib/proofs'
import StatCard from '../components/StatCard.vue'
import StatusBadge from '../components/StatusBadge.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const result = generateProofResult()

const chartData = computed(() => ({
  labels: result.monthly_2025.map(r => r.month),
  datasets: [
    {
      label: 'P50',
      data: result.monthly_2025.map(r => r.p50),
      backgroundColor: 'rgba(80, 190, 255, 0.7)',
    },
    {
      label: 'Actual',
      data: result.monthly_2025.map(r => r.actual),
      backgroundColor: 'rgba(70, 220, 130, 0.7)',
    },
  ],
}))

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
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.panel { padding: 14px; }
.chart { height: 260px; }
.table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
</style>
