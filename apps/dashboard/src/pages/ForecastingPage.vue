<template>
  <div :class="['intel-page', `intel-page--${selectedSiteType}`]">
    <div class="intel-header">
      <div>
        <div class="eyebrow">GRID INTEL FUSION</div>
        <h1 class="title">{{ currentSite?.name ?? 'Forecast Console' }}</h1>
        <div class="subline">
          <span>{{ currentSite?.region ?? '-' }}</span>
          <span>{{ selectedSiteType.toUpperCase() }}</span>
          <span>{{ tsData?.source ?? 'unknown_source' }}</span>
        </div>
      </div>

      <div class="controls">
        <select v-model="selectedSite" class="dl-select" @change="loadAll">
          <option v-for="site in catalog" :key="site.site_id" :value="site.site_id">
            {{ site.name }} ({{ site.asset_type }})
          </option>
        </select>
        <select v-model.number="historyHours" class="dl-select" @change="loadAll">
          <option :value="72">72 h history</option>
          <option :value="168">7 d history</option>
          <option :value="720">30 d history</option>
        </select>
        <select v-model.number="horizonHours" class="dl-select" @change="renderAll">
          <option :value="24">24 h projection</option>
          <option :value="48">48 h projection</option>
          <option :value="72">72 h projection</option>
          <option :value="168">7 d projection</option>
        </select>
        <select v-model="selectedMetric" class="dl-select" @change="renderAll">
          <option v-for="metric in metricOptions" :key="metric.key" :value="metric.key">
            {{ metric.label }}
          </option>
        </select>
        <select v-model="driverMode" class="dl-select" @change="renderAll">
          <option value="all">all signals</option>
          <option value="core">core signals</option>
        </select>
          <button class="btn-refresh" :disabled="loading" @click="loadAll">REFRESH</button>
      </div>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div class="intel-grid">
      <section class="panel panel--wide">
        <div class="panel-title">OBSERVED + FORWARD PROJECTION <span>{{ selectedMetricLabel }} · {{ selectedMetric === 'generation_mw' ? 'archive-calibrated LGPD projection' : 'history-derived signal projection' }}</span></div>
        <div v-if="loading" class="loading-row">LOADING</div>
        <div v-else class="chart-wrap"><canvas ref="timelineCanvas"></canvas></div>
      </section>

      <section class="panel">
        <div class="panel-title">SPECTRAL POWER DENSITY <span>{{ selectedMetricLabel }} frequency content</span></div>
        <div class="chart-wrap"><canvas ref="spectralCanvas"></canvas></div>
      </section>

      <section class="panel">
        <div class="panel-title">DRIVER STACK <span>{{ driverMode === 'all' ? 'all signals shown' : 'core signals shown' }}</span></div>
        <div class="chart-wrap"><canvas ref="driverCanvas"></canvas></div>
      </section>

      <section class="panel panel--wide">
        <div class="panel-title">HOURLY REGIME + RESIDUAL STRUCTURE <span>{{ selectedMetricLabel }} shape extracted from downloaded history</span></div>
        <div class="chart-wrap"><canvas ref="regimeCanvas"></canvas></div>
      </section>

      <section class="panel">
        <div class="panel-title">L + G STATE <span>{{ pipelineLocalScoreRows.length }} scored interactions · structural state</span></div>
        <div class="stack-wrap">
          <div class="mini-block">
            <div class="mini-title">CURRENT SIGNALS</div>
            <div class="kv-grid">
              <div v-for="row in currentSignalRows" :key="row.key" class="kv-row">
                <span>{{ row.key }}</span>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </div>
          <div class="mini-block">
            <div class="mini-title">STRUCTURAL STATE</div>
            <div class="kv-grid">
              <div v-for="row in siteStateRows" :key="row.key" class="kv-row">
                <span>{{ row.key }}</span>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </div>
          <div class="mini-block">
            <div class="mini-title">LOCAL SCORES</div>
            <div class="table-lite">
              <div class="table-lite__head">
                <span>type</span>
                <span>score</span>
                <span>tw</span>
              </div>
              <div v-for="row in pipelineLocalScoreRows" :key="row.key" class="table-lite__row">
                <span>{{ row.label }}</span>
                <strong>{{ row.score }}</strong>
                <span>{{ row.temporalWeight }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">P FORECAST + RECONCILIATION <span>{{ pipelineForecastRows.length }} forecast terms</span></div>
        <div class="stack-wrap">
          <div class="mini-block">
            <div class="mini-title">FORECAST</div>
            <div class="kv-grid">
              <div v-for="row in pipelineForecastRows" :key="row.key" class="kv-row">
                <span>{{ row.key }}</span>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </div>
          <div class="mini-block">
            <div class="mini-title">RECONCILIATION</div>
            <div class="kv-grid">
              <div v-for="row in reconciliationRows" :key="row.key" class="kv-row">
                <span>{{ row.key }}</span>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </div>
          <div class="mini-block">
            <div class="mini-title">DRIFT / RESIDUAL</div>
            <div class="kv-grid">
              <div v-for="row in residualRows" :key="row.key" class="kv-row">
                <span>{{ row.key }}</span>
                <strong>{{ row.value }}</strong>
              </div>
              <div class="kv-row kv-row--wide">
                <span>drift.reason</span>
                <strong>{{ structuralDriftReason }}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel panel--wide">
        <div class="panel-title">D DECISION RANKING <span>{{ decisionRows.length }} candidates scored from forecast state</span></div>
        <div class="table-lite table-lite--decision">
          <div class="table-lite__head">
            <span>type</span>
            <span>priority</span>
            <span>score</span>
            <span>conf</span>
            <span>urg</span>
            <span>value</span>
            <span>evidence</span>
          </div>
          <div v-if="!decisionRows.length" class="loading-row">NO DECISION CANDIDATES</div>
          <div v-for="row in decisionRows" :key="row.id" class="table-lite__row table-lite__row--decision">
            <span>{{ row.type }}</span>
            <span>{{ row.priority }}</span>
            <strong>{{ row.score }}</strong>
            <span>{{ row.confidence }}</span>
            <span>{{ row.urgency }}</span>
            <span>{{ row.value }}</span>
            <span>{{ row.evidenceCount }}</span>
          </div>
        </div>
      </section>

      <section class="panel panel--wide">
        <div class="panel-title">AUDIT TRACE <span>{{ auditTraceRows.length }} deterministic steps</span></div>
        <div class="trace-wrap">
          <div v-for="step in auditTraceRows" :key="step.index" class="trace-row">
            <div class="trace-step">{{ step.index }} · {{ step.step }}</div>
            <div class="trace-reasoning">{{ step.reasoning }}</div>
            <div class="trace-meta">{{ step.output }}</div>
          </div>
        </div>
      </section>

      <section class="panel panel--wide panel--matrix">
        <div class="panel-title">SIGNAL MATRIX <span>{{ usedSignalCount }}/{{ totalSignalCount }} populated in selected window</span></div>
        <div class="matrix-wrap">
          <table class="signal-table">
            <thead>
              <tr>
                <th>Signal</th>
                <th>Last</th>
                <th>Avail</th>
                <th>Norm</th>
                <th>Weight</th>
                <th>Contribution</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in signalMatrixRows" :key="row.key" :class="{ 'is-core': row.isCore }">
                <td>{{ row.label }}</td>
                <td>{{ row.lastText }}</td>
                <td>{{ row.availabilityPct.toFixed(0) }}%</td>
                <td>{{ row.norm.toFixed(2) }}</td>
                <td>{{ row.weight.toFixed(2) }}</td>
                <td :class="row.contribution >= 0 ? 'pos' : 'neg'">{{ row.contribution.toFixed(2) }}</td>
                <td>{{ row.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import {
  api,
  type PipelineRecommendation,
  type SitePipelineResponse,
  type SourceSummaryResponse,
  type TimeseriesResponse,
  type TimeseriesRow,
} from '../lib/api'
import type { SiteSummary } from '../lib/api'

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Filler,
  Tooltip,
)

type AssetMode = 'solar' | 'wind'

interface SeriesPoint {
  ts: string
  mw: number
  row: TimeseriesRow
}

interface ProjectionPoint {
  ts: string
  p10: number
  p50: number
  p90: number
}

interface MetricSeriesPoint {
  ts: string
  value: number
  row: TimeseriesRow
}

type MetricKey = 'generation_mw' | keyof TimeseriesRow

interface SignalMatrixRow {
  key: keyof TimeseriesRow
  label: string
  lastText: string
  availabilityPct: number
  norm: number
  weight: number
  contribution: number
  status: 'LIVE' | 'SPARSE' | 'MISSING'
  isCore: boolean
}

const SIGNAL_KEYS: Array<keyof TimeseriesRow> = [
  'temperature_2m',
  'wind_speed_10m',
  'wind_speed_80m',
  'wind_speed_120m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'shortwave_radiation',
  'direct_normal_irradiance',
  'diffuse_radiation',
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'relative_humidity_2m',
  'precipitation',
  'pressure_msl',
]

const SIGNAL_WEIGHTS: Record<keyof TimeseriesRow, number> = {
  ts: 0,
  temperature_2m: -0.06,
  wind_speed_10m: 0.12,
  wind_speed_80m: 0.14,
  wind_speed_120m: 0.1,
  wind_direction_10m: 0.03,
  wind_gusts_10m: -0.05,
  shortwave_radiation: 0.15,
  direct_normal_irradiance: 0.12,
  diffuse_radiation: 0.05,
  cloud_cover: -0.12,
  cloud_cover_low: -0.06,
  cloud_cover_mid: -0.05,
  cloud_cover_high: -0.04,
  relative_humidity_2m: -0.04,
  precipitation: -0.07,
  pressure_msl: 0.03,
}

const SIGNAL_LABELS: Record<keyof TimeseriesRow, string> = {
  ts: 'timestamp',
  temperature_2m: 'temperature_2m',
  wind_speed_10m: 'wind_speed_10m',
  wind_speed_80m: 'wind_speed_80m',
  wind_speed_120m: 'wind_speed_120m',
  wind_direction_10m: 'wind_direction_10m',
  wind_gusts_10m: 'wind_gusts_10m',
  shortwave_radiation: 'shortwave_radiation',
  direct_normal_irradiance: 'direct_normal_irradiance',
  diffuse_radiation: 'diffuse_radiation',
  cloud_cover: 'cloud_cover',
  cloud_cover_low: 'cloud_cover_low',
  cloud_cover_mid: 'cloud_cover_mid',
  cloud_cover_high: 'cloud_cover_high',
  relative_humidity_2m: 'relative_humidity_2m',
  precipitation: 'precipitation',
  pressure_msl: 'pressure_msl',
}

const CORE_SIGNALS: Record<AssetMode, Array<keyof TimeseriesRow>> = {
  wind: [
    'wind_speed_10m',
    'wind_speed_80m',
    'wind_speed_120m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'temperature_2m',
    'pressure_msl',
    'relative_humidity_2m',
    'cloud_cover',
    'precipitation',
  ],
  solar: [
    'shortwave_radiation',
    'direct_normal_irradiance',
    'diffuse_radiation',
    'cloud_cover',
    'cloud_cover_low',
    'cloud_cover_mid',
    'cloud_cover_high',
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation',
    'pressure_msl',
  ],
}

const DRIVER_SIGNAL_ORDER: Record<AssetMode, Array<keyof TimeseriesRow>> = {
  solar: [
    'shortwave_radiation',
    'direct_normal_irradiance',
    'diffuse_radiation',
    'cloud_cover',
    'cloud_cover_low',
    'cloud_cover_mid',
    'cloud_cover_high',
    'temperature_2m',
    'wind_speed_10m',
    'relative_humidity_2m',
    'precipitation',
    'pressure_msl',
  ],
  wind: [
    'wind_speed_80m',
    'wind_speed_120m',
    'wind_speed_10m',
    'wind_gusts_10m',
    'wind_direction_10m',
    'temperature_2m',
    'pressure_msl',
    'relative_humidity_2m',
    'cloud_cover',
    'precipitation',
  ],
}

const DRIVER_COLORS = [
  '#28bfff',
  '#69e3aa',
  '#ffc933',
  '#ff8a8a',
  '#9ea7ff',
  '#f3b9ff',
  '#7bb1ff',
  '#d7d7d7',
]

const route = useRoute()
const loading = ref(false)
const error = ref('')
const summary = ref<SourceSummaryResponse | null>(null)
const catalog = ref<SiteSummary[]>([])
const tsData = ref<TimeseriesResponse | null>(null)
const pipeline = ref<SitePipelineResponse | null>(null)

const selectedSite = ref('')
const historyHours = ref(168)
const horizonHours = ref(168)
const selectedMetric = ref<MetricKey>('generation_mw')
const driverMode = ref<'all' | 'core'>('all')

const timelineCanvas = ref<HTMLCanvasElement | null>(null)
const spectralCanvas = ref<HTMLCanvasElement | null>(null)
const driverCanvas = ref<HTMLCanvasElement | null>(null)
const regimeCanvas = ref<HTMLCanvasElement | null>(null)

let timelineChart: Chart | null = null
let spectralChart: Chart | null = null
let driverChart: Chart | null = null
let regimeChart: Chart | null = null

const currentSite = computed(() => catalog.value.find(site => site.site_id === selectedSite.value) ?? null)
const selectedSiteType = computed<AssetMode>(() => currentSite.value?.asset_type ?? 'wind')
const capacityKw = computed(() => (selectedSiteType.value === 'wind' ? 100_000 : 50_000))

const metricOptions = computed(() => [
  { key: 'generation_mw' as MetricKey, label: 'generation_mw (derived)' },
  ...SIGNAL_KEYS.map(key => ({ key: key as MetricKey, label: SIGNAL_LABELS[key] })),
])

const selectedMetricLabel = computed(() =>
  selectedMetric.value === 'generation_mw'
    ? 'generation_mw'
    : SIGNAL_LABELS[selectedMetric.value],
)

function numericRecordValue(record: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!record) return null
  const value = record[key]
  return typeof value === 'number' && !Number.isNaN(value) ? value : null
}

function stringRecordValue(record: Record<string, unknown> | null | undefined, key: string): string {
  if (!record) return '-'
  const value = record[key]
  if (typeof value === 'string' && value) return value
  if (typeof value === 'number' && !Number.isNaN(value)) return value.toFixed(3)
  return '-'
}

function formatUnknown(value: unknown): string {
  if (value == null) return '-'
  if (typeof value === 'number') return Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(3)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join(', ')
  return JSON.stringify(value)
}

const latestTimeseriesRow = computed<TimeseriesRow | null>(() => {
  const rows = tsData.value?.rows ?? []
  return rows.length ? rows[rows.length - 1] : null
})

const currentSignalRows = computed(() => {
  const row = latestTimeseriesRow.value
  if (!row) return []

  const measured = SIGNAL_KEYS.map((key) => ({
    key: SIGNAL_LABELS[key],
    value: formatUnknown(row[key]),
  }))

  return [
    ...measured,
    { key: 'derived_generation_mw', value: formatUnknown(modeledKw(row) / 1000) },
  ]
})

const siteStateRows = computed(() => {
  const state = pipeline.value?.site_state ?? {}
  return Object.entries(state).map(([key, value]) => ({ key, value: formatUnknown(value) }))
})

const pipelineLocalScoreRows = computed(() =>
  (pipeline.value?.local_scores ?? []).slice(0, 8).map((row, index) => ({
    key: `${String(row.interaction_type ?? 'interaction')}-${index}`,
    label: String(row.interaction_type ?? '-'),
    score: formatUnknown(row.score),
    temporalWeight: formatUnknown(row.temporal_weight),
  })),
)

const pipelineForecastRows = computed(() => {
  const forecast = pipeline.value?.forecast ?? {}
  return [
    'raw_expected_generation_mwh',
    'calibrated_p10_mwh',
    'calibrated_p50_mwh',
    'calibrated_p90_mwh',
    'forecast_trust_score',
    'forecast_trust_grade',
    'dominant_term',
    'uncertainty_score',
  ].map((key) => ({ key, value: formatUnknown(forecast[key]) }))
})

const reconciliationRows = computed(() => {
  const reconciliation = pipeline.value?.reconciliation ?? {}
  return Object.entries(reconciliation).map(([key, value]) => ({ key, value: formatUnknown(value) }))
})

const residualRows = computed(() => {
  const residuals = pipeline.value?.residuals ?? {}
  const drift = pipeline.value?.structural_drift ?? {}
  return [
    ...Object.entries(residuals).map(([key, value]) => ({ key, value: formatUnknown(value) })),
    { key: 'drift.risk', value: formatUnknown(drift.risk) },
    { key: 'drift.magnitude', value: formatUnknown(drift.drift_magnitude) },
  ]
})

const structuralDriftReason = computed(() => stringRecordValue(pipeline.value?.structural_drift ?? {}, 'reason'))

const pipelineRecommendations = computed<PipelineRecommendation[]>(() => pipeline.value?.recommendations ?? [])

const decisionRows = computed(() =>
  pipelineRecommendations.value.map((rec) => ({
    id: rec.recommendation_id,
    type: rec.recommendation_type,
    priority: rec.priority,
    score: rec.signal_score.toFixed(2),
    confidence: rec.confidence.toFixed(2),
    urgency: rec.urgency_hours == null ? '-' : `${rec.urgency_hours.toFixed(0)}h`,
    value: rec.estimated_value_usd == null ? '-' : `$${rec.estimated_value_usd.toFixed(0)}`,
    evidenceCount: String(rec.evidence.length),
  })),
)

const auditTraceRows = computed(() =>
  (pipeline.value?.audit_trace?.steps ?? []).map((step, index) => ({
    index: index + 1,
    step: String(step.step ?? '-'),
    reasoning: String(step.reasoning ?? '-'),
    output: formatUnknown(step.output),
  })),
)

function metricValue(row: TimeseriesRow, metric: MetricKey): number | null {
  if (metric === 'generation_mw') return modeledKw(row) / 1000
  const value = row[metric]
  return typeof value === 'number' && !Number.isNaN(value) ? value : null
}

function metricValueText(value: number | null): string {
  if (value == null) return '-'
  return Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(3)
}

function clampProjectedMetric(value: number, metric: MetricKey): number {
  if (metric === 'temperature_2m') return value
  if (metric === 'wind_direction_10m') {
    const normalized = value % 360
    return normalized < 0 ? normalized + 360 : normalized
  }
  return Math.max(0, value)
}

function computeWindOutputKw(windSpeedMps: number | null | undefined): number {
  if (windSpeedMps == null || windSpeedMps < 3 || windSpeedMps >= 25) return 0
  if (windSpeedMps >= 12) return capacityKw.value
  const normalized = (windSpeedMps - 3) / 9
  return capacityKw.value * normalized * normalized * normalized
}

function computeSolarOutputKw(ghiWm2: number | null | undefined, temperatureC: number | null | undefined): number {
  if (ghiWm2 == null || ghiWm2 <= 0) return 0
  const irradianceFraction = ghiWm2 / 1000
  const cellTemp = (temperatureC ?? 20) + 30 * irradianceFraction
  const tempDerate = Math.max(0.5, 1 + (-0.004) * (cellTemp - 25))
  const dcOutput = capacityKw.value * irradianceFraction * tempDerate
  return Math.max(0, dcOutput * (1 - 0.14) / 1.2)
}

function modeledKw(row: TimeseriesRow): number {
  if (selectedSiteType.value === 'wind') {
    return computeWindOutputKw(row.wind_speed_10m ?? row.wind_speed_80m)
  }
  return computeSolarOutputKw(row.shortwave_radiation, row.temperature_2m)
}

const observedSeries = computed<SeriesPoint[]>(() =>
  (tsData.value?.rows ?? []).map(row => ({
    ts: row.ts,
    mw: modeledKw(row) / 1000,
    row,
  })),
)

const metricSeries = computed<MetricSeriesPoint[]>(() =>
  (tsData.value?.rows ?? [])
    .map((row) => ({ ts: row.ts, value: metricValue(row, selectedMetric.value), row }))
    .filter((point): point is MetricSeriesPoint => point.value != null),
)

const totalSignalCount = SIGNAL_KEYS.length

const usedSignalCount = computed(() => {
  const rows = tsData.value?.rows ?? []
  if (!rows.length) return 0
  return SIGNAL_KEYS.filter((key) => rows.some((row) => row[key] != null)).length
})

const signalMatrixRows = computed<SignalMatrixRow[]>(() => {
  const rows = tsData.value?.rows ?? []
  const coreSet = new Set(CORE_SIGNALS[selectedSiteType.value])

  return SIGNAL_KEYS.map((key) => {
    const numericValues = rows
      .map((row) => row[key])
      .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))

    const availabilityPct = rows.length ? (numericValues.length / rows.length) * 100 : 0
    const lastRaw = numericValues.length ? numericValues[numericValues.length - 1] : null
    const lastText = lastRaw == null ? '-' : Math.abs(lastRaw) >= 100 ? lastRaw.toFixed(1) : lastRaw.toFixed(3)

    const mean = signalRecentMeans.value[key] ?? 0
    const scale = signalScales.value[key] ?? 1
    const norm = lastRaw == null ? 0 : Math.max(-2, Math.min(2, (lastRaw - mean) / Math.max(scale, 1e-6)))
    const weight = SIGNAL_WEIGHTS[key] ?? 0
    const contribution = weight * norm

    let status: 'LIVE' | 'SPARSE' | 'MISSING' = 'MISSING'
    if (availabilityPct >= 70) status = 'LIVE'
    else if (availabilityPct > 0) status = 'SPARSE'

    return {
      key,
      label: SIGNAL_LABELS[key],
      lastText,
      availabilityPct,
      norm,
      weight,
      contribution,
      status,
      isCore: coreSet.has(key),
    }
  }).sort((a, b) => {
    if (a.isCore !== b.isCore) return a.isCore ? -1 : 1
    return Math.abs(b.contribution) - Math.abs(a.contribution)
  })
})

const signalRecentMeans = computed(() => {
  const rows = (tsData.value?.rows ?? []).slice(-48)
  const means: Record<string, number> = {}
  for (const key of SIGNAL_KEYS) {
    let sum = 0
    let count = 0
    for (const row of rows) {
      const value = row[key]
      if (typeof value === 'number' && !Number.isNaN(value)) {
        sum += value
        count += 1
      }
    }
    means[key] = count ? sum / count : 0
  }
  return means
})

const signalScales = computed(() => {
  const rows = tsData.value?.rows ?? []
  const scales: Record<string, number> = {}
  for (const key of SIGNAL_KEYS) {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (const row of rows) {
      const value = row[key]
      if (typeof value === 'number' && !Number.isNaN(value)) {
        min = Math.min(min, value)
        max = Math.max(max, value)
      }
    }
    scales[key] = Number.isFinite(min) && Number.isFinite(max) ? Math.max(1e-6, max - min) : 1
  }
  return scales
})

const hourlySignalMeans = computed(() => {
  const rows = tsData.value?.rows ?? []
  const out: Record<string, number[]> = {}

  for (const key of SIGNAL_KEYS) {
    const buckets = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
    for (const row of rows) {
      const value = row[key]
      if (typeof value === 'number' && !Number.isNaN(value)) {
        const hour = new Date(row.ts).getUTCHours()
        buckets[hour].sum += value
        buckets[hour].count += 1
      }
    }
    out[key] = buckets.map((bucket) => (bucket.count ? bucket.sum / bucket.count : signalRecentMeans.value[key] ?? 0))
  }

  return out
})

const hourlyProfileMw = computed<number[]>(() => {
  const buckets = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
  for (const point of observedSeries.value) {
    const hour = new Date(point.ts).getUTCHours()
    buckets[hour].sum += point.mw
    buckets[hour].count += 1
  }
  return buckets.map(bucket => (bucket.count ? bucket.sum / bucket.count : 0))
})

const hourlyProfileMetric = computed<number[]>(() => {
  const buckets = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
  for (const point of metricSeries.value) {
    const hour = new Date(point.ts).getUTCHours()
    buckets[hour].sum += point.value
    buckets[hour].count += 1
  }
  return buckets.map(bucket => (bucket.count ? bucket.sum / bucket.count : 0))
})

const pipelineProjectionSeries = computed<ProjectionPoint[]>(() =>
  (pipeline.value?.projection ?? [])
    .map((point) => {
      const ts = typeof point.ts === 'string' ? point.ts : null
      const p10 = typeof point.p10 === 'number' ? point.p10 : null
      const p50 = typeof point.p50 === 'number' ? point.p50 : null
      const p90 = typeof point.p90 === 'number' ? point.p90 : null
      if (!ts || p10 == null || p50 == null || p90 == null) return null
      return { ts, p10, p50, p90 }
    })
    .filter((point): point is ProjectionPoint => point != null),
)

const projectionSeries = computed<ProjectionPoint[]>(() => {
  if (selectedMetric.value === 'generation_mw' && pipelineProjectionSeries.value.length) {
    return pipelineProjectionSeries.value
  }

  const observed = metricSeries.value
  if (!observed.length) return []

  const last = observed[observed.length - 1]
  const recent = observed.slice(Math.max(0, observed.length - 24))

  let bias = 0
  if (recent.length) {
    let sumErr = 0
    for (const point of recent) {
      const h = new Date(point.ts).getUTCHours()
      sumErr += point.value - hourlyProfileMetric.value[h]
    }
    bias = sumErr / recent.length
  }

  const trend = recent.length >= 2
    ? (recent[recent.length - 1].value - recent[0].value) / (recent.length - 1)
    : 0

  const residuals = observed.map((point) => {
    const h = new Date(point.ts).getUTCHours()
    return point.value - (hourlyProfileMetric.value[h] + bias)
  })
  const sigma = stddev(residuals)

  const out: ProjectionPoint[] = []
  const lastTs = new Date(last.ts)
  for (let i = 1; i <= horizonHours.value; i += 1) {
    const t = new Date(lastTs)
    t.setUTCHours(t.getUTCHours() + i)
    const hour = t.getUTCHours()

    const syntheticSignal: Record<string, number> = {}
    for (const key of SIGNAL_KEYS) {
      syntheticSignal[key] = hourlySignalMeans.value[key]?.[hour] ?? signalRecentMeans.value[key] ?? 0
    }

    const syntheticRow: TimeseriesRow = {
      ts: t.toISOString(),
      temperature_2m: syntheticSignal.temperature_2m,
      wind_speed_10m: syntheticSignal.wind_speed_10m,
      wind_speed_80m: syntheticSignal.wind_speed_80m,
      wind_speed_120m: syntheticSignal.wind_speed_120m,
      wind_direction_10m: syntheticSignal.wind_direction_10m,
      wind_gusts_10m: syntheticSignal.wind_gusts_10m,
      shortwave_radiation: syntheticSignal.shortwave_radiation,
      direct_normal_irradiance: syntheticSignal.direct_normal_irradiance,
      diffuse_radiation: syntheticSignal.diffuse_radiation,
      cloud_cover: syntheticSignal.cloud_cover,
      cloud_cover_low: syntheticSignal.cloud_cover_low,
      cloud_cover_mid: syntheticSignal.cloud_cover_mid,
      cloud_cover_high: syntheticSignal.cloud_cover_high,
      relative_humidity_2m: syntheticSignal.relative_humidity_2m,
      precipitation: syntheticSignal.precipitation,
      pressure_msl: syntheticSignal.pressure_msl,
    }

    const selectedSynthetic = metricValue(syntheticRow, selectedMetric.value)
    const physicsValue = selectedMetric.value === 'generation_mw'
      ? modeledKw(syntheticRow) / 1000
      : (selectedSynthetic ?? signalRecentMeans.value[selectedMetric.value as keyof TimeseriesRow] ?? 0)
    const profileValue = hourlyProfileMetric.value[hour] + bias + trend * i * 0.4

    let fusion = 0
    for (const key of SIGNAL_KEYS) {
      const expected = syntheticSignal[key]
      const recentMean = signalRecentMeans.value[key] ?? 0
      const scale = signalScales.value[key] ?? 1
      const z = Math.max(-2, Math.min(2, (expected - recentMean) / Math.max(scale, 1e-6)))
      const weight = SIGNAL_WEIGHTS[key] ?? 0
      fusion += weight * z
    }

    const blendedValue = (profileValue * 0.6 + physicsValue * 0.4) * (1 + 0.08 * fusion)
    const fusedValue = clampProjectedMetric(blendedValue, selectedMetric.value)
    const sigmaInflation = 1 + Math.min(0.8, Math.abs(fusion) * 0.25)
    const sigmaFused = sigma * sigmaInflation

    out.push({
      ts: t.toISOString(),
      p50: fusedValue,
      p10: clampProjectedMetric(fusedValue - 1.28 * sigmaFused, selectedMetric.value),
      p90: clampProjectedMetric(fusedValue + 1.28 * sigmaFused, selectedMetric.value),
    })
  }
  return out
})

const residualSigmaMw = computed(() => {
  const observed = observedSeries.value
  if (!observed.length) return 0
  const residuals = observed.map((point) => {
    const h = new Date(point.ts).getUTCHours()
    return point.mw - hourlyProfileMw.value[h]
  })
  return stddev(residuals)
})

const p50Energy24h = computed(() =>
  projectionSeries.value.slice(0, 24).reduce((sum, point) => sum + point.p50, 0),
)

const lastObservedMw = computed(() => observedSeries.value[observedSeries.value.length - 1]?.mw ?? 0)
const bandWidthMw = computed(() => {
  if (!projectionSeries.value.length) return 0
  const latest = projectionSeries.value[0]
  return Math.max(0, latest.p90 - latest.p10)
})
const rowCount = computed(() => observedSeries.value.length)

const coveragePct = computed(() => {
  const rows = tsData.value?.rows ?? []
  if (!rows.length) return 0
  const valid = rows.filter((row) => {
    if (selectedSiteType.value === 'wind') return row.wind_speed_10m != null || row.wind_speed_80m != null
    return row.shortwave_radiation != null
  }).length
  return (valid / rows.length) * 100
})

function stddev(values: number[]): number {
  if (!values.length) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function normalizedZSeries(values: Array<number | null>): number[] {
  const numeric = values.filter((value): value is number => value != null)
  if (!numeric.length) return values.map(() => 0)
  const mu = mean(numeric)
  const sigma = Math.max(1e-6, stddev(numeric))
  return values.map((value) => {
    if (value == null) return 0
    const z = (value - mu) / sigma
    return Math.max(-2.5, Math.min(2.5, z))
  })
}

function computeDFT(values: number[]): Array<{ period: number; amplitude: number }> {
  const n = values.length
  if (n < 8) return []
  const result: Array<{ period: number; amplitude: number }> = []

  for (let k = 1; k <= Math.floor(n / 2); k += 1) {
    let real = 0
    let imag = 0
    for (let t = 0; t < n; t += 1) {
      const angle = (-2 * Math.PI * k * t) / n
      real += values[t] * Math.cos(angle)
      imag += values[t] * Math.sin(angle)
    }
    const amplitude = Math.sqrt(real * real + imag * imag) / n
    const period = n / k
    if (period >= 2 && period <= 72) {
      result.push({ period, amplitude })
    }
  }

  return result.sort((a, b) => a.period - b.period)
}

function destroyCharts() {
  timelineChart?.destroy()
  spectralChart?.destroy()
  driverChart?.destroy()
  regimeChart?.destroy()
  timelineChart = null
  spectralChart = null
  driverChart = null
  regimeChart = null
}

function renderTimeline() {
  timelineChart?.destroy()
  timelineChart = null
  if (!timelineCanvas.value) return

  const observed = metricSeries.value
  const projection = projectionSeries.value
  if (!observed.length) return

  const labels = [
    ...observed.map(point => point.ts.slice(5, 16).replace('T', ' ')),
    ...projection.map(point => point.ts.slice(5, 16).replace('T', ' ')),
  ]

  const observedData = [...observed.map(point => point.value), ...projection.map(() => null)]
  const p50Data = [...observed.map(() => null), ...projection.map(point => point.p50)]
  const p10Data = [...observed.map(() => null), ...projection.map(point => point.p10)]
  const p90Data = [...observed.map(() => null), ...projection.map(point => point.p90)]
  const capMw = capacityKw.value / 1000
  const datasets: any[] = [
    {
      label: `Observed ${selectedMetricLabel.value}`,
      data: observedData,
      borderColor: '#28bfff',
      backgroundColor: 'rgba(40,191,255,0.15)',
      pointRadius: 0,
      borderWidth: 1.8,
      tension: 0.2,
    },
    {
      label: 'Proj P10',
      data: p10Data,
      borderColor: 'rgba(0,0,0,0)',
      pointRadius: 0,
      fill: false,
      tension: 0.2,
    },
    {
      label: 'Proj P90',
      data: p90Data,
      borderColor: '#ffc933',
      backgroundColor: 'rgba(255,201,51,0.18)',
      pointRadius: 0,
      borderWidth: 1.2,
      fill: '-1',
      tension: 0.2,
    },
    {
      label: 'Proj P50',
      data: p50Data,
      borderColor: '#69e3aa',
      pointRadius: 0,
      borderWidth: 1.8,
      borderDash: [5, 3],
      tension: 0.2,
    },
  ]

  if (selectedMetric.value === 'generation_mw') {
    datasets.push({
      label: 'Capacity',
      data: labels.map(() => capMw),
      borderColor: 'rgba(255,255,255,0.35)',
      pointRadius: 0,
      borderWidth: 1,
      borderDash: [3, 4],
    })
  }

  timelineChart = new Chart(timelineCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#cde5f7', boxWidth: 10 } },
      },
      scales: {
        x: { ticks: { color: '#6f8aa0', maxTicksLimit: 12 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#6f8aa0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
      },
    },
  })
}

function renderSpectral() {
  spectralChart?.destroy()
  spectralChart = null
  if (!spectralCanvas.value) return

  const values = metricSeries.value.map(point => point.value)
  if (values.length < 16) return

  const maxPoints = 360
  const stride = Math.max(1, Math.floor(values.length / maxPoints))
  const sampled = values.filter((_, index) => index % stride === 0)
  const spectrum = computeDFT(sampled)
  const top = [...spectrum].sort((a, b) => b.amplitude - a.amplitude).slice(0, 3).map(entry => entry.period)

  spectralChart = new Chart(spectralCanvas.value, {
    type: 'bar',
    data: {
      labels: spectrum.map(entry => `${entry.period.toFixed(1)}h`),
      datasets: [
        {
          label: 'Amplitude (MW)',
          data: spectrum.map(entry => entry.amplitude),
          backgroundColor: spectrum.map(entry => top.includes(entry.period) ? 'rgba(255,201,51,0.8)' : 'rgba(40,191,255,0.75)'),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6f8aa0', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#6f8aa0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
      },
    },
  })
}

function renderDrivers() {
  driverChart?.destroy()
  driverChart = null
  if (!driverCanvas.value) return

  const rows = (tsData.value?.rows ?? []).slice(-72)
  if (!rows.length) return

  const labels = rows.map(row => row.ts.slice(11, 16))
  const candidateKeys = driverMode.value === 'core'
    ? CORE_SIGNALS[selectedSiteType.value]
    : DRIVER_SIGNAL_ORDER[selectedSiteType.value]

  const ranked = candidateKeys
    .map((key) => {
      const values = rows.map((row) => {
        const value = row[key]
        return typeof value === 'number' && !Number.isNaN(value) ? value : null
      })
      const available = values.filter((value): value is number => value != null)
      const availability = rows.length ? available.length / rows.length : 0
      if (availability < 0.2) {
        return null
      }

      const normalized = normalizedZSeries(values)
      const relevance = stddev(normalized) * Math.abs(SIGNAL_WEIGHTS[key] ?? 0.01)
      return { key, normalized, availability, relevance }
    })
    .filter((entry): entry is { key: keyof TimeseriesRow; normalized: number[]; availability: number; relevance: number } => entry != null)
    .sort((a, b) => b.relevance - a.relevance)

  const maxSignals = driverMode.value === 'core' ? 5 : 8
  const selected = ranked.slice(0, maxSignals)
  if (!selected.length) return

  const datasets: any[] = selected.map((entry, index) => ({
    label: `${SIGNAL_LABELS[entry.key]} (${(entry.availability * 100).toFixed(0)}%)`,
    data: entry.normalized,
    borderColor: DRIVER_COLORS[index % DRIVER_COLORS.length],
    pointRadius: 0,
    borderWidth: index < 3 ? 1.8 : 1.2,
    tension: 0.2,
  }))

  const netDriver = rows.map((_, rowIndex) => {
    let weighted = 0
    let denom = 0
    for (const entry of selected) {
      const weight = Math.abs(SIGNAL_WEIGHTS[entry.key] ?? 0.01)
      weighted += entry.normalized[rowIndex] * weight
      denom += weight
    }
    return denom > 0 ? weighted / denom : 0
  })

  datasets.push({
    label: 'net_driver_index',
    data: netDriver,
    borderColor: '#ffffff',
    pointRadius: 0,
    borderWidth: 2,
    borderDash: [4, 3],
    tension: 0.2,
  })

  driverChart = new Chart(driverCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#cde5f7',
            boxWidth: 9,
            font: { size: 10 },
          },
        },
      },
      scales: {
        x: { ticks: { color: '#6f8aa0', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: {
          min: -2.5,
          max: 2.5,
          ticks: { color: '#6f8aa0' },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  })
}

function renderRegime() {
  regimeChart?.destroy()
  regimeChart = null
  if (!regimeCanvas.value) return

  const profile = hourlyProfileMetric.value
  if (!profile.length) return

  const observed = metricSeries.value
  const residualByHour = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
  for (const point of observed) {
    const h = new Date(point.ts).getUTCHours()
    residualByHour[h].sum += point.value - profile[h]
    residualByHour[h].count += 1
  }

  const residualMean = residualByHour.map(entry => (entry.count ? entry.sum / entry.count : 0))
  const residualAbsMax = Math.max(0.01, ...residualMean.map(value => Math.abs(value)))

  regimeChart = new Chart(regimeCanvas.value, {
    data: {
      labels: Array.from({ length: 24 }, (_, hour) => `${hour.toString().padStart(2, '0')}:00`),
      datasets: [
        {
          type: 'bar',
          label: `Hourly profile ${selectedMetricLabel.value}`,
          data: profile,
          backgroundColor: 'rgba(40,191,255,0.55)',
          borderWidth: 0,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: `Residual mean ${selectedMetricLabel.value}`,
          data: residualMean,
          borderColor: '#ffc933',
          pointRadius: 0,
          borderWidth: 1.8,
          tension: 0.2,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#cde5f7', boxWidth: 10 } } },
      scales: {
        x: { ticks: { color: '#6f8aa0', maxTicksLimit: 12 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#6f8aa0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y1: {
          position: 'right',
          suggestedMin: -residualAbsMax * 1.1,
          suggestedMax: residualAbsMax * 1.1,
          ticks: {
            color: '#d6c279',
            callback: (value) => Number(value).toFixed(2),
          },
          grid: { drawOnChartArea: false },
        },
      },
    },
  })
}

function renderAll() {
  renderTimeline()
  renderSpectral()
  renderDrivers()
  renderRegime()
}

async function loadAll() {
  if (!selectedSite.value) return
  loading.value = true
  error.value = ''

  try {
    const [timeseries, sitePipeline] = await Promise.all([
      api.timeseries(selectedSite.value, historyHours.value),
      api.sitePipeline(selectedSite.value, historyHours.value, horizonHours.value),
    ])
    tsData.value = timeseries
    pipeline.value = sitePipeline
  } catch (e: any) {
    error.value = e?.message ?? 'LOAD_FAILED'
  } finally {
    loading.value = false
    await nextTick()
    renderAll()
  }
}

onMounted(async () => {
  try {
    summary.value = await api.sourceSummary()
    catalog.value = summary.value.sites
    selectedSite.value = (route.query.siteId as string) || catalog.value[0]?.site_id || ''
    if (selectedSite.value) await loadAll()
  } catch (e: any) {
    error.value = e?.message ?? 'INIT_FAILED'
  }
})

watch([selectedSite, historyHours], async () => {
  if (!selectedSite.value) return
  await loadAll()
})

watch([horizonHours], async () => {
  if (!selectedSite.value) return
  await loadAll()
})

watch([selectedMetric, driverMode], async () => {
  await nextTick()
  renderAll()
})

onBeforeUnmount(() => {
  destroyCharts()
})
</script>

<style scoped>
.intel-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.intel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: #7ebad6;
  font-family: 'Menlo', monospace;
}

.title {
  margin: 4px 0;
  font-size: 22px;
  line-height: 1.1;
}

.subline {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: var(--text-2);
  font-family: 'Menlo', monospace;
}

.subline span {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
}

.controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.intel-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: minmax(240px, 1.35fr) minmax(210px, 1.05fr) minmax(210px, 1.05fr) minmax(360px, 1.7fr);
  grid-template-areas:
    'timeline timeline'
    'spectral drivers'
    'regime regime'
    'matrix matrix';
  gap: 10px;
}

.panel {
  background: rgba(7, 17, 28, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.panel--wide {
  grid-column: span 2;
}

.panel:nth-child(1) {
  grid-area: timeline;
}

.panel:nth-child(2) {
  grid-area: spectral;
}

.panel:nth-child(3) {
  grid-area: drivers;
}

.panel:nth-child(4) {
  grid-area: regime;
}

.panel:nth-child(5) {
  grid-area: matrix;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: #7dc6ea;
  font-family: 'Menlo', monospace;
}

.panel-title span {
  color: #627e92;
  font-size: 9px;
  letter-spacing: 0.08em;
}

.chart-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}

.chart-wrap :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
}

.loading-row {
  font-size: 10px;
  color: #6e8a9f;
  font-family: 'Menlo', monospace;
}

.stack-wrap {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

.mini-block {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
}

.mini-title {
  margin-bottom: 6px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #7dc6ea;
  font-family: 'Menlo', monospace;
}

.kv-grid {
  display: grid;
  gap: 4px;
}

.kv-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  font-size: 10px;
  font-family: 'Menlo', monospace;
  color: #93aec2;
}

.kv-row strong {
  color: #d7ebf7;
  font-weight: 600;
}

.kv-row--wide {
  grid-template-columns: 84px minmax(0, 1fr);
}

.table-lite {
  display: grid;
  gap: 4px;
  font-size: 10px;
  font-family: 'Menlo', monospace;
}

.table-lite__head,
.table-lite__row {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) repeat(2, minmax(42px, 0.6fr));
  gap: 8px;
  align-items: center;
}

.table-lite__head {
  color: #6f8aa0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.table-lite__row {
  color: #b8cfde;
}

.table-lite__row strong {
  color: #edf8ff;
}

.table-lite--decision .table-lite__head,
.table-lite--decision .table-lite__row--decision {
  grid-template-columns: minmax(0, 1.4fr) 0.9fr 0.7fr 0.7fr 0.7fr 0.8fr 0.7fr;
}

.trace-wrap {
  display: grid;
  gap: 6px;
  overflow: auto;
}

.trace-row {
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}

.trace-step {
  color: #d9eefb;
  font-size: 10px;
  letter-spacing: 0.06em;
  font-family: 'Menlo', monospace;
}

.trace-reasoning {
  margin-top: 4px;
  color: #9db7c9;
  font-size: 11px;
}

.trace-meta {
  margin-top: 4px;
  color: #6f8aa0;
  font-size: 10px;
  font-family: 'Menlo', monospace;
}

.error-banner {
  padding: 8px 10px;
  border: 1px solid rgba(255, 108, 108, 0.35);
  background: rgba(120, 26, 26, 0.25);
  border-radius: 10px;
  color: #ffb0b0;
  font-size: 12px;
}

.matrix-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  max-height: none;
}

.signal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  font-family: 'Menlo', monospace;
}

.signal-table th,
.signal-table td {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-align: right;
  white-space: nowrap;
}

.signal-table th:first-child,
.signal-table td:first-child {
  text-align: left;
}

.signal-table thead th {
  position: sticky;
  top: 0;
  background: rgba(8, 20, 32, 0.98);
  color: #7dc6ea;
  letter-spacing: 0.08em;
  z-index: 1;
}

.signal-table tr.is-core td:first-child {
  color: #b8f7ff;
  font-weight: 700;
}

.signal-table td.pos {
  color: #69e3aa;
}

.signal-table td.neg {
  color: #ff9a9a;
}

@media (max-width: 1100px) {
  .intel-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      'timeline'
      'spectral'
      'drivers'
      'regime'
      'matrix';
    grid-template-rows: minmax(240px, 1.3fr) minmax(210px, 1fr) minmax(210px, 1fr) minmax(210px, 1fr) minmax(340px, 1.4fr);
  }

  .panel--wide {
    grid-column: auto;
  }
}

@media (max-width: 760px) {
  .intel-header {
    flex-direction: column;
  }
}
</style>
