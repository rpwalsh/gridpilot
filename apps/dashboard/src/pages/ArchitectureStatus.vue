<template>
  <div class="arch-page">
    <div class="arch-header">
      <span class="page-eyebrow">CLOUD / DISTRIBUTED ARCHITECTURE STATUS</span>
      <button class="btn-refresh" @click="load" :disabled="loading">↻ Refresh</button>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- System health strip -->
    <div class="arch-health-strip">
      <div class="hs-card" v-for="svc in services" :key="svc.id">
        <div :class="['hs-dot', `hs-dot--${svc.health}`]"></div>
        <div class="hs-body">
          <div class="hs-name">{{ svc.name }}</div>
          <div class="hs-sub">{{ svc.subtitle }}</div>
        </div>
        <div class="hs-latency" v-if="svc.latency">{{ svc.latency }}</div>
      </div>
    </div>

    <!-- Architecture diagram -->
    <div class="arch-diagram">
      <div class="ad-row ad-row--top">
        <div class="ad-block ad-block--external" v-for="ext in externalSources" :key="ext.id">
          <div class="ab-icon">{{ ext.icon }}</div>
          <div class="ab-name">{{ ext.name }}</div>
          <div class="ab-sub">{{ ext.sub }}</div>
          <div :class="['ab-badge', ext.badgeClass]">{{ ext.badge }}</div>
        </div>
      </div>
      <div class="ad-arrows">
        <div class="ad-arrow-line"></div>
        <div class="ad-arrow-label">HTTP / REST · provider adapters</div>
      </div>
      <div class="ad-row ad-row--mid">
        <div class="ad-block ad-block--internal" v-for="svc in internalServices" :key="svc.id">
          <div class="ab-icon">{{ svc.icon }}</div>
          <div class="ab-name">{{ svc.name }}</div>
          <div class="ab-sub">{{ svc.sub }}</div>
          <div :class="['ab-badge', svc.badgeClass]">{{ svc.badge }}</div>
        </div>
      </div>
      <div class="ad-arrows">
        <div class="ad-arrow-line"></div>
        <div class="ad-arrow-label">internal bus · async workers</div>
      </div>
      <div class="ad-row ad-row--bot">
        <div class="ad-block ad-block--storage" v-for="store in storageLayer" :key="store.id">
          <div class="ab-icon">{{ store.icon }}</div>
          <div class="ab-name">{{ store.name }}</div>
          <div class="ab-sub">{{ store.sub }}</div>
        </div>
      </div>
    </div>

    <!-- API health from real endpoint -->
    <div class="arch-api-health">
      <div class="section-title">API SERVICE HEALTH
        <span class="section-note">real API response</span>
      </div>
      <div class="api-health-grid" v-if="apiHealth">
        <div class="ahg-row">
          <span class="ahg-key">status</span>
          <span :class="['ahg-val', apiHealth.status === 'ok' ? 'ahg-ok' : 'ahg-warn']">{{ apiHealth.status?.toUpperCase() }}</span>
        </div>
        <div class="ahg-row">
          <span class="ahg-key">version</span>
          <span class="ahg-val ahg-mono">{{ apiHealth.version }}</span>
        </div>
        <div class="ahg-row">
          <span class="ahg-key">sites indexed</span>
          <span class="ahg-val ahg-mono">{{ apiHealth.sites_indexed }}</span>
        </div>
        <div class="ahg-row">
          <span class="ahg-key">archive points</span>
          <span class="ahg-val ahg-mono">{{ apiHealth.hourly_archive_points?.toLocaleString() }}</span>
        </div>
        <div class="ahg-row">
          <span class="ahg-key">power data</span>
          <span class="ahg-val" style="color:#ffc133">{{ apiHealth.power_data_status?.site_level_power_available ? 'AVAILABLE' : 'OFFLINE' }}</span>
        </div>
      </div>
      <div v-else class="loading-row">Loading API health…</div>
    </div>

    <!-- Provider probes row -->
    <div class="arch-probes">
      <div class="section-title">EXTERNAL PROVIDER PROBES
        <span class="section-note">{{ healthData?.checked_utc?.slice(0,16).replace('T',' ') ?? '—' }} UTC</span>
      </div>
      <div class="probes-row" v-if="healthData">
        <div v-for="(probe, name) in healthData.providers" :key="name" class="probe-card">
          <div class="pc-name">{{ name }}</div>
          <div :class="['pc-status', probe.status === 'success' ? 'pc-ok' : 'pc-err']">{{ probe.status.toUpperCase() }}</div>
          <div class="pc-latency" v-if="probe.latency_ms != null">{{ probe.latency_ms }} ms</div>
          <div class="pc-note" v-if="probe.note">{{ probe.note }}</div>
        </div>
      </div>
      <div v-else class="loading-row">Probing providers…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, type ProvidersHealthResponse, type ApiHealthResponse } from '../lib/api'

const loading = ref(false)
const error = ref('')
const healthData = ref<ProvidersHealthResponse | null>(null)
const apiHealth = ref<ApiHealthResponse | null>(null)

interface ServiceEntry { id: string; name: string; subtitle: string; health: 'ok' | 'warn' | 'down' | 'unknown'; latency?: string }

const services = computed<ServiceEntry[]>(() => {
  const apiOk = apiHealth.value?.status === 'ok'
  const probeResults = healthData.value?.providers ?? {}
  const providerOk = Object.values(probeResults).some(p => p.status === 'success')

  return [
    { id: 'api', name: 'FastAPI Service', subtitle: 'ECS / Fargate-ready', health: apiOk ? 'ok' : 'unknown' },
    { id: 'forecast', name: 'Forecast Engine', subtitle: 'dispatchlayer-forecasting v0.1.0', health: apiOk ? 'ok' : 'unknown' },
    { id: 'ingest', name: 'Ingestion Workers', subtitle: 'Lambda-style jobs · cron', health: apiOk ? 'ok' : 'unknown' },
    { id: 'anomaly', name: 'Anomaly Detector', subtitle: 'dispatchlayer-anomaly v0.1.0', health: 'ok' as const },
    { id: 'providers', name: 'Provider Probes', subtitle: 'HTTP health checks', health: providerOk ? 'ok' : 'warn' },
    { id: 'dispatch', name: 'Dispatch Optimizer', subtitle: 'dispatchlayer-dispatch v0.1.0', health: 'ok' as const },
  ]
})

const externalSources = [
  { id: 'open_meteo', name: 'Open-Meteo', sub: 'Weather archive · forecast', icon: '🌦', badge: 'FREE API', badgeClass: 'badge-green' },
  { id: 'nasa_power', name: 'NASA POWER', sub: 'Solar irradiance archive', icon: '🛰', badge: 'FREE API', badgeClass: 'badge-green' },
  { id: 'noaa_nws', name: 'NOAA NWS', sub: 'Weather forecast', icon: '🌀', badge: 'FREE API', badgeClass: 'badge-green' },
  { id: 'eia', name: 'EIA', sub: 'Grid generation data', icon: '⚡', badge: 'KEY REQUIRED', badgeClass: 'badge-yellow' },
  { id: 'entsoe', name: 'ENTSO-E', sub: 'European grid data', icon: '🇪🇺', badge: 'KEY REQUIRED', badgeClass: 'badge-yellow' },
]

const internalServices = [
  { id: 'api_svc', name: 'API Gateway', sub: 'FastAPI · CORS · OpenAPI docs', icon: '🔌', badge: 'RUNNING', badgeClass: 'badge-green' },
  { id: 'forecast_svc', name: 'Forecast Engine', sub: 'Physics models · P10/P50/P90', icon: '📈', badge: 'RUNNING', badgeClass: 'badge-green' },
  { id: 'dispatch_svc', name: 'Dispatch Optimizer', sub: 'Schedule optimization', icon: '⚙️', badge: 'RUNNING', badgeClass: 'badge-green' },
  { id: 'anomaly_svc', name: 'Anomaly Detector', sub: 'Statistical drift detection', icon: '🔍', badge: 'RUNNING', badgeClass: 'badge-green' },
  { id: 'signals_svc', name: 'Signals Processor', sub: 'MQTT · OPC-UA · Parquet', icon: '📡', badge: 'CONFIGURABLE', badgeClass: 'badge-gray' },
]

const storageLayer = [
  { id: 's3', name: 'Archive Store', sub: 'S3-compatible · 5-yr hourly', icon: '🗄' },
  { id: 'ts', name: 'Timeseries API', sub: 'REST · field slices', icon: '📊' },
  { id: 'parquet', name: 'Parquet Sink', sub: 'Columnar analytics', icon: '📦' },
  { id: 'catalog', name: 'Site Catalog', sub: 'JSON · lat/lon/type', icon: '🗺' },
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    apiHealth.value = await api.health()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load'
  } finally {
    loading.value = false
  }
  api.providersHealth()
    .then(h => { healthData.value = h })
    .catch(() => {})
}

onMounted(load)
</script>

<style scoped>
.arch-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.arch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.page-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-1);
}

.btn-refresh {
  background: none; border: 1px solid var(--cyan-border); color: var(--cyan);
  border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 11px;
}

.error-banner {
  background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3);
  color: #ff8080; padding: 8px 12px; border-radius: 6px; font-size: 12px;
}

/* Health strip */
.arch-health-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.hs-card {
  flex: 1;
  min-width: 120px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 8px;
  padding: 8px 12px;
}

.hs-dot {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
}
.hs-dot--ok      { background: #66d36e; box-shadow: 0 0 6px #66d36e; }
.hs-dot--warn    { background: #ffc133; }
.hs-dot--down    { background: #ff5050; }
.hs-dot--unknown { background: #91a8b8; }

.hs-body { flex: 1; }
.hs-name { font-size: 11px; font-weight: 600; color: var(--text-0); }
.hs-sub  { font-size: 9px; color: var(--text-2); margin-top: 1px; font-family: 'Menlo', monospace; }
.hs-latency { font-size: 9px; color: var(--text-2); font-family: 'Menlo', monospace; }

/* Architecture diagram */
.arch-diagram {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ad-row { display: flex; gap: 8px; }

.ad-block {
  flex: 1;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
}

.ad-block--external { border: 1px solid rgba(255,201,51,0.3); background: rgba(255,201,51,0.04); }
.ad-block--internal { border: 1px solid var(--cyan-border); background: rgba(40,191,255,0.04); }
.ad-block--storage  { border: 1px solid rgba(150,100,255,0.3); background: rgba(150,100,255,0.04); }

.ab-icon { font-size: 16px; }
.ab-name { font-size: 10px; font-weight: 700; color: var(--text-0); }
.ab-sub  { font-size: 8px; color: var(--text-2); font-family: 'Menlo', monospace; }

.ab-badge {
  margin-top: 3px;
  font-size: 8px; font-weight: 700; letter-spacing: 0.06em;
  padding: 1px 5px; border-radius: 3px;
}

.badge-green  { background: rgba(102,211,110,0.15); color: #66d36e; }
.badge-yellow { background: rgba(255,201,51,0.15);  color: #ffc133; }
.badge-gray   { background: rgba(100,120,140,0.15); color: #91a8b8; }

.ad-arrows {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
}

.ad-arrow-line {
  width: 2px;
  height: 14px;
  background: linear-gradient(180deg, rgba(40,191,255,0.5), rgba(40,191,255,0.15));
}

.ad-arrow-label {
  font-size: 9px;
  color: var(--text-2);
  font-family: 'Menlo', monospace;
  letter-spacing: 0.05em;
}

/* API health */
.arch-api-health {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-1);
}

.section-note {
  font-weight: 400;
  letter-spacing: 0;
  color: var(--text-2);
  font-size: 10px;
  margin-left: 8px;
  font-family: 'Menlo', monospace;
}

.loading-row { font-size: 12px; color: var(--text-2); padding: 4px 0; }

.api-health-grid { display: flex; gap: 24px; flex-wrap: wrap; }

.ahg-row { display: flex; gap: 8px; align-items: baseline; }
.ahg-key { font-size: 10px; color: var(--text-2); min-width: 100px; }
.ahg-val { font-size: 11px; font-weight: 600; color: var(--text-0); }
.ahg-mono { font-family: 'Menlo', monospace; }
.ahg-ok { color: #66d36e; }
.ahg-warn { color: #ffc133; }

/* Provider probes */
.arch-probes {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
}

.probes-row { display: flex; gap: 8px; flex-wrap: wrap; }

.probe-card {
  flex: 1;
  min-width: 100px;
  background: rgba(4,14,24,0.6);
  border: 1px solid var(--cyan-border);
  border-radius: 8px;
  padding: 8px 12px;
}

.pc-name    { font-size: 10px; font-weight: 700; color: var(--text-1); font-family: 'Menlo', monospace; margin-bottom: 4px; }
.pc-status  { font-size: 11px; font-weight: 700; }
.pc-ok  { color: #66d36e; }
.pc-err { color: #ff5050; }
.pc-latency { font-size: 10px; color: var(--text-2); font-family: 'Menlo', monospace; margin-top: 2px; }
.pc-note    { font-size: 9px; color: var(--text-2); margin-top: 3px; }
</style>
