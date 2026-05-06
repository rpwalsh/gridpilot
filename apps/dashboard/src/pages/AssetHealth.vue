<template>
  <section class="page-grid">
    <div class="page-header">
      <h1>Asset Health</h1>
      <button class="nav-link" @click="refresh">Refresh</button>
    </div>

    <article class="glass-panel panel">
      <table class="table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Power</th>
            <th>Expected</th>
            <th>Residual %</th>
            <th>Health</th>
            <th>Fault</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="asset in assets" :key="asset.asset_id">
            <td>{{ asset.asset_id }}</td>
            <td>{{ asset.asset_type }}</td>
            <td>{{ n(asset.power_kw) }}</td>
            <td>{{ n(asset.expected_power_kw) }}</td>
            <td>{{ residual(asset) }}</td>
            <td>{{ scoreText(asset.asset_id) }}</td>
            <td>{{ health[asset.asset_id]?.fault_code ?? '-' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!assets.length" class="muted">No assets available.</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

type Asset = {
  asset_id: string
  asset_type: string
  power_kw?: number
  expected_power_kw?: number
}

type Health = {
  health_score?: number
  fault_code?: string | null
}

const assets = ref<Asset[]>([])
const health = ref<Record<string, Health>>({})

function n(value?: number) {
  return value == null ? 'n/a' : value.toFixed(2)
}

function residual(asset: Asset) {
  if (asset.power_kw == null || asset.expected_power_kw == null || asset.expected_power_kw === 0) return 'n/a'
  return `${(((asset.power_kw - asset.expected_power_kw) / asset.expected_power_kw) * 100).toFixed(1)}%`
}

function scoreText(assetId: string) {
  const score = health.value[assetId]?.health_score
  return score == null ? 'n/a' : `${Math.round(score * 100)}%`
}

async function refresh() {
  try {
    const telemetry = await axios.get('/api/v1/sites/solar_nrel_golden_1/telemetry/latest?data_mode=source')
    assets.value = telemetry.data?.assets ?? []
    const updates: Record<string, Health> = {}
    await Promise.all(
      assets.value.map(async (asset) => {
        try {
          const resp = await axios.get(`/api/v1/assets/${asset.asset_id}/health?data_mode=source`)
          updates[asset.asset_id] = resp.data
        } catch {
          updates[asset.asset_id] = {}
        }
      }),
    )
    health.value = updates
  } catch {
    assets.value = []
    health.value = {}
  }
}

onMounted(refresh)
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 7px; border-bottom: 1px solid rgba(80, 190, 255, 0.12); }
.muted { color: #91a8b8; }
</style>
