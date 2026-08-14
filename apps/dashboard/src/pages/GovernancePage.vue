<template>
  <div class="gov-page">
    <div class="gov-header">
      <span class="page-eyebrow">AI GOVERNANCE &amp; MODEL REGISTRY</span>
      <button class="btn-refresh" @click="load" :disabled="loading">↻ Refresh</button>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Model registry -->
    <div class="gov-section">
      <div class="section-title">MODEL REGISTRY</div>
      <div class="model-cards">
        <div v-for="m in modelRegistry" :key="m.id" class="model-card">
          <div class="mc-status" :class="`mc-status--${m.status}`"></div>
          <div class="mc-body">
            <div class="mc-name">{{ m.name }}</div>
            <div class="mc-version">{{ m.version }}</div>
            <div class="mc-desc">{{ m.description }}</div>
          </div>
          <div class="mc-meta">
            <div class="mcm-row"><span class="mcm-key">type</span><span class="mcm-val">{{ m.type }}</span></div>
            <div class="mcm-row"><span class="mcm-key">deterministic</span><span class="mcm-val">{{ m.deterministic ? 'YES' : 'NO' }}</span></div>
            <div class="mcm-row"><span class="mcm-key">uncertainty</span><span class="mcm-val">{{ m.uncertaintyMethod }}</span></div>
            <div class="mcm-row"><span class="mcm-key">fallback</span><span class="mcm-val">{{ m.fallback }}</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Provider governance row -->
    <div class="gov-section">
      <div class="section-title">DATA PROVIDER GOVERNANCE
        <span class="section-note">live probe: {{ healthData?.checked_utc?.slice(0,16).replace('T',' ') ?? '—' }} UTC</span>
      </div>
      <div class="provider-cards">
        <div v-for="p in enrichedProviders" :key="p.name" class="prov-card">
          <div class="prov-name">{{ p.name }}</div>
          <div class="prov-rows">
            <div class="prov-row">
              <span class="pr-key">Enabled</span>
              <span :class="['pr-val', p.enabled ? 'pr-ok' : 'pr-warn']">{{ p.enabled ? 'YES' : 'NO' }}</span>
            </div>
            <div class="prov-row">
              <span class="pr-key">Requires API Key</span>
              <span class="pr-val">{{ p.requires_key ? 'YES' : 'NO' }}</span>
            </div>
            <div class="prov-row" v-if="p.requires_key">
              <span class="pr-key">Key Configured</span>
              <span :class="['pr-val', p.key_configured ? 'pr-ok' : 'pr-err']">{{ p.key_configured ? 'SET' : 'MISSING' }}</span>
            </div>
            <div class="prov-row">
              <span class="pr-key">Live Status</span>
              <span :class="['pr-val', probeColor(p.name)]">{{ probeStatus(p.name) }}</span>
            </div>
            <div class="prov-row" v-if="probeLatency(p.name)">
              <span class="pr-key">Latency</span>
              <span class="pr-val pr-mono">{{ probeLatency(p.name) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Governance controls -->
    <div class="gov-controls-grid">
      <div v-for="ctrl in governanceControls" :key="ctrl.id" class="gc-card">
        <div class="gc-icon">{{ ctrl.icon }}</div>
        <div class="gc-body">
          <div class="gc-name">{{ ctrl.name }}</div>
          <div class="gc-desc">{{ ctrl.description }}</div>
        </div>
        <div :class="['gc-status', `gc-status--${ctrl.statusClass}`]">{{ ctrl.status }}</div>
      </div>
    </div>

    <!-- Decision trace sample -->
    <div class="gov-section gov-section--trace" v-if="traceSample">
      <div class="section-title">SAMPLE DECISION TRACE
        <span class="section-note">from last forecast run</span>
      </div>
      <div class="trace-list">
        <div v-for="(step, i) in traceSample" :key="i" class="trace-entry">
          <span class="te-num">{{ String(i+1).padStart(2,'0') }}</span>
          <span class="te-step">{{ step.step }}</span>
          <span class="te-reason">{{ step.reasoning }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, type ProvidersHealthResponse, type ProviderConfig, type SiteForecastResponse } from '../lib/api'

const loading = ref(false)
const error = ref('')
const providerListData = ref<ProviderConfig[]>([])
const healthData = ref<ProvidersHealthResponse | null>(null)
const lastForecast = ref<SiteForecastResponse | null>(null)

interface ModelEntry {
  id: string
  name: string
  version: string
  description: string
  type: string
  deterministic: boolean
  uncertaintyMethod: string
  fallback: string
  status: 'active' | 'deprecated' | 'experimental'
}

const modelRegistry: ModelEntry[] = [
  {
    id: 'wind_power_curve',
    name: 'wind_power_curve',
    version: '0.1.0',
    description: 'Polynomial power curve estimator from real-time wind speed at hub height. Applies Betz limit corrections.',
    type: 'physics-based regression',
    deterministic: true,
    uncertaintyMethod: 'P10/P90 multiplicative factors',
    fallback: 'linear interpolation',
    status: 'active',
  },
  {
    id: 'solar_irradiance_model',
    name: 'solar_irradiance_model',
    version: '0.1.0',
    description: 'PVWatts-style DC power estimation from GHI and temperature coefficient. Derate for cloud cover.',
    type: 'physics-based regression',
    deterministic: true,
    uncertaintyMethod: 'P10/P90 multiplicative factors',
    fallback: 'zero-output floor',
    status: 'active',
  },
  {
    id: 'portfolio_forecast',
    name: 'portfolio_forecast',
    version: '0.1.0',
    description: 'Portfolio aggregation of per-site P10/P50/P90. Naive sum with cross-site variance reduction.',
    type: 'aggregation model',
    deterministic: true,
    uncertaintyMethod: 'portfolio variance reduction factor',
    fallback: 'site-level sum only',
    status: 'active',
  },
  {
    id: 'predictive_core',
    name: 'predictive_core',
    version: '0.1.0',
    description: 'Confidence scoring and causal attribution engine. Ingests decision traces, outputs evidence-weighted scores.',
    type: 'interpretability module',
    deterministic: true,
    uncertaintyMethod: 'evidence-weighted confidence interval',
    fallback: 'uncertainty_score = 0.5',
    status: 'active',
  },
]

interface GovernanceControl {
  id: string; name: string; description: string; icon: string; status: string; statusClass: string
}

const governanceControls: GovernanceControl[] = [
  { id: 'data_lineage', name: 'Data Lineage', description: 'Every forecast traceable to source provider, ingestion timestamp, and feature values.', icon: '🔗', status: 'ACTIVE', statusClass: 'ok' },
  { id: 'determinism', name: 'Deterministic Models', description: 'Physics-based models produce reproducible outputs for identical inputs. No stochastic sampling.', icon: '⚙️', status: 'ENFORCED', statusClass: 'ok' },
  { id: 'human_override', name: 'Human Override', description: 'Dispatch recommendations require human confirmation before execution. No autonomous actions.', icon: '🧑', status: 'REQUIRED', statusClass: 'ok' },
  { id: 'confidence_gate', name: 'Confidence Gate', description: 'Forecasts with uncertainty_score > 0.5 flagged for review. Threshold configurable.', icon: '🛡', status: 'ACTIVE', statusClass: 'ok' },
  { id: 'audit_trail', name: 'Audit Trail', description: 'All forecast inputs, outputs, and decision traces logged with UTC timestamp.', icon: '📋', status: 'ENABLED', statusClass: 'ok' },
  { id: 'model_versioning', name: 'Model Versioning', description: 'Semantic version on every model. Old versions retained for comparison.', icon: '🏷', status: 'v0.1.0', statusClass: 'ok' },
]

const enrichedProviders = computed(() => providerListData.value)

function probeStatus(name: string) {
  const h = healthData.value?.providers?.[name]
  if (!h) return '—'
  return h.status.toUpperCase()
}

function probeColor(name: string) {
  const h = healthData.value?.providers?.[name]
  if (!h) return ''
  if (h.status === 'success') return 'pr-ok'
  if (h.status === 'unreachable') return 'pr-err'
  return 'pr-warn'
}

function probeLatency(name: string) {
  const h = healthData.value?.providers?.[name]
  if (!h || h.latency_ms == null) return null
  return h.latency_ms + ' ms'
}

interface TraceStep { step: string; reasoning: string }

const traceSample = computed<TraceStep[] | null>(() => {
  const t = lastForecast.value?.decision_trace
  if (!t || typeof t !== 'object') return null
  const steps = (t as any).steps
  if (!Array.isArray(steps)) return null
  return steps.slice(0, 6) as TraceStep[]
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [providers, sites] = await Promise.all([
      api.providersList(),
      api.sourceSummary(),
    ])
    providerListData.value = providers.providers

    // Run a forecast to get a real decision trace
    if (sites.sites.length > 0) {
      const site = sites.sites[0]
      lastForecast.value = await api.forecastSite({
        site_id: site.site_id,
        asset_type: site.asset_type === 'wind' ? 'wind_turbine' : 'solar_inverter',
        capacity_kw: site.asset_type === 'wind' ? 100_000 : 50_000,
        wind_speed_mps: site.wind_speed_mps ?? undefined,
        ghi_wm2: site.ghi_wm2 ?? undefined,
        temperature_c: site.temperature_c ?? 20,
      })
    }
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
.gov-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.gov-header {
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

.gov-section { display: flex; flex-direction: column; gap: 8px; }
.gov-section--trace { padding-bottom: 12px; }

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

/* Model cards */
.model-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }

.model-card {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.mc-status {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.mc-status--active       { background: #66d36e; }
.mc-status--deprecated   { background: #ffc133; }
.mc-status--experimental { background: #91a8b8; }

.mc-body { flex: 1; }

.mc-name    { font-size: 11px; font-weight: 700; color: var(--cyan); font-family: 'Menlo', monospace; }
.mc-version { font-size: 9px; color: var(--text-2); margin-top: 1px; }
.mc-desc    { font-size: 10px; color: var(--text-1); margin-top: 5px; line-height: 1.4; }

.mc-meta { border-top: 1px solid var(--cyan-border); padding-top: 8px; display: flex; flex-direction: column; gap: 3px; }

.mcm-row { display: flex; gap: 6px; }
.mcm-key { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; color: var(--text-2); min-width: 80px; }
.mcm-val { font-size: 9px; color: var(--text-1); font-family: 'Menlo', monospace; }

/* Provider cards */
.provider-cards { display: flex; gap: 8px; }

.prov-card {
  flex: 1;
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
}

.prov-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-0);
  font-family: 'Menlo', monospace;
  margin-bottom: 8px;
}

.prov-rows { display: flex; flex-direction: column; gap: 4px; }

.prov-row { display: flex; justify-content: space-between; align-items: center; }

.pr-key { font-size: 10px; color: var(--text-2); }
.pr-val { font-size: 10px; font-weight: 600; color: var(--text-0); }
.pr-mono { font-family: 'Menlo', monospace; }
.pr-ok   { color: #66d36e; }
.pr-err  { color: #ff5050; }
.pr-warn { color: #ffc133; }

/* Governance controls grid */
.gov-controls-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

.gc-card {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.gc-icon { font-size: 20px; flex-shrink: 0; }

.gc-body { flex: 1; }
.gc-name { font-size: 11px; font-weight: 700; color: var(--text-0); margin-bottom: 3px; }
.gc-desc { font-size: 10px; color: var(--text-1); line-height: 1.4; }

.gc-status {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: 3px;
  flex-shrink: 0;
  align-self: flex-start;
}
.gc-status--ok { background: rgba(102,211,110,0.15); color: #66d36e; }

/* Trace */
.trace-list {
  background: linear-gradient(180deg, rgba(10,30,48,0.95), rgba(4,14,24,0.98));
  border: 1px solid var(--cyan-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trace-entry {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 11px;
}

.te-num    { font-family: 'Menlo', monospace; font-size: 9px; color: var(--text-2); flex-shrink: 0; min-width: 18px; padding-top: 2px; }
.te-step   { font-family: 'Menlo', monospace; font-size: 10px; font-weight: 700; color: var(--cyan); flex-shrink: 0; min-width: 160px; }
.te-reason { color: var(--text-1); line-height: 1.4; font-size: 10px; }
</style>
