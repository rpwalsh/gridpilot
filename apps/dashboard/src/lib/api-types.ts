export type ProviderHealthInfo = {
  status?: string
  latency_ms?: number
  degraded_mode?: string
}

export type ProviderHealthResponse = {
  providers?: Record<string, ProviderHealthInfo>
}

export type OverviewSourceSummaryResponse = {
  totals?: {
    total_hourly_points?: number
  }
}

export type AuditTraceResponse = Record<string, unknown>

export type ApiErrorResponse = {
  detail?: string
}

export type SourceItem = {
  id: string
  name: string
  type: string
  provider: string
  coverage: string
  status: string
}

export type SourcesResponse = {
  sources?: SourceItem[]
}

export type ChartCatalogItem = {
  id: string
  group: string
  name: string
  desc: string
}

export type ChartsCatalogResponse = {
  charts?: ChartCatalogItem[]
}
