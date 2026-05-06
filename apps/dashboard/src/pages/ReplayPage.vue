<template>
  <section class="page-grid">
    <h1>Replay</h1>

    <article class="glass-panel panel">
      <p class="section-label">Current Frame — {{ current.timestamp }}</p>
      <p class="metric-value">{{ current.power_kw.toFixed(1) }} kW</p>

      <div class="scrubber-row">
        <button class="nav-link" @click="togglePlay">{{ playing ? 'Pause' : 'Play' }}</button>
        <input
          type="range"
          class="scrubber"
          :min="0"
          :max="frames.length - 1"
          :value="index"
          @input="onScrub"
        />
        <span class="frame-label">{{ index + 1 }} / {{ frames.length }}</span>
      </div>
    </article>

    <article class="glass-panel panel">
      <p class="section-label">Power Trace</p>
      <Line :data="chartData" :options="chartOptions" class="chart" />
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const frames = Array.from({ length: 72 }).map((_, i) => ({
  timestamp: `2026-05-01T${String(i % 24).padStart(2, '0')}:00Z`,
  power_kw: 450 + Math.sin(i / 5) * 120,
}))

const index = ref(0)
const playing = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const current = computed(() => frames[index.value])

function onScrub(e: Event) {
  index.value = Number((e.target as HTMLInputElement).value)
}

function togglePlay() {
  playing.value = !playing.value
  if (playing.value) {
    timer = setInterval(() => {
      index.value = (index.value + 1) % frames.length
    }, 200)
  } else if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onBeforeUnmount(() => { if (timer) clearInterval(timer) })

const chartData = computed(() => ({
  labels: frames.map(f => f.timestamp.slice(11, 16)),
  datasets: [
    {
      label: 'kW',
      data: frames.map(f => f.power_kw),
      borderColor: 'rgba(80, 190, 255, 0.6)',
      pointRadius: frames.map((_, i) => i === index.value ? 6 : 0),
      pointBackgroundColor: frames.map((_, i) => i === index.value ? '#50beff' : 'transparent'),
      tension: 0.4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#91a8b8', maxTicksLimit: 12 }, grid: { color: 'rgba(80,190,255,0.08)' } },
    y: { ticks: { color: '#91a8b8' }, grid: { color: 'rgba(80,190,255,0.08)' } },
  },
}
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.scrubber-row { display: flex; gap: 10px; align-items: center; margin-top: 14px; }
.scrubber { flex: 1; accent-color: #50beff; cursor: pointer; }
.frame-label { color: #91a8b8; font-size: 13px; white-space: nowrap; }
.chart { height: 240px; }
</style>
