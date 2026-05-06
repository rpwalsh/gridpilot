/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

// ─── Asset ───────────────────────────────────────────────────────────────────

export type AssetType = 'wind' | 'solar' | 'storage' | 'hybrid'
export type AssetStatus = 'online' | 'degraded' | 'curtailed' | 'offline'

export interface Asset {
  id: string
  name: string
  type: AssetType
  region: string
  capacityMw: number
  outputMw: number
  forecastMw: number
  performanceRatio: number   // 0–1
  curtailmentRisk: 'low' | 'medium' | 'high'
  weatherDriver: string
  lastTelemetry: string      // ISO timestamp
  dataQuality: number        // 0–100
  status: AssetStatus
}

// ─── Telemetry ───────────────────────────────────────────────────────────────

export interface TelemetryFrame {
  ts: string                 // ISO
  actualMw: number
  expectedMw: number
  irradiance?: number        // W/m²
  windSpeed?: number         // m/s
  temperature: number        // °C
  cloudCover: number         // 0–100 %
  dataQuality: number        // 0–100
  confidence: number         // 0–1
  residual: number           // actual – expected
  source: string
  anomaly: boolean
}

// ─── Forecast ────────────────────────────────────────────────────────────────

export type ForecastHorizon = '1h' | '6h' | '24h' | '7d'

export interface ForecastPoint {
  ts: string
  actual: number | null
  forecast: number
  ciLow: number
  ciHigh: number
  residual: number | null
}

export interface ModelMetadata {
  id: string
  name: string
  version: string
  owner: string
  lastTrained: string
  horizon: string
  mae: number
  rmse: number
  mape: number
  confidence: number         // 0–1
  features: string[]
  status: 'active' | 'shadow' | 'deprecated' | 'experimental'
  riskLevel: 'low' | 'medium' | 'high'
  explainabilityEnabled: boolean
  humanReviewRequired: boolean
  lastGovernanceReview: string
}

// ─── Data Sources & Lineage ──────────────────────────────────────────────────

export type SourceType = 'telemetry' | 'meteorological' | 'forecast' | 'market' | 'asset_metadata'
export type IngestionStatus = 'active' | 'degraded' | 'failed' | 'paused'
export type ValidationStatus = 'passed' | 'warning' | 'failed' | 'pending'

export interface DataSource {
  id: string
  name: string
  type: SourceType
  provider: string
  recordsIngested: number
  lastUpdate: string         // ISO
  freshnessSeconds: number
  missingPct: number
  stalePct: number
  schemaVersion: string
  contentHash: string
  ingestionStatus: IngestionStatus
  validationStatus: ValidationStatus
  latencyMs: number
}

export interface LineageNode {
  id: string
  label: string
  kind: 'source' | 'ingestion' | 'normalization' | 'feature_store' | 'model' | 'output'
  status: 'ok' | 'warn' | 'error'
}

// ─── Governance ──────────────────────────────────────────────────────────────

export type GovernanceStatus = 'approved' | 'needs_review' | 'deprecated' | 'experimental'

export interface GovernanceRecord {
  id: string
  modelId: string
  modelName: string
  version: string
  owner: string
  status: GovernanceStatus
  approvedUseCases: string[]
  restrictedUseCases: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  explainabilityStatus: 'complete' | 'partial' | 'none'
  validationStatus: ValidationStatus
  humanReviewRequired: boolean
  lastGovernanceReview: string
  driftMonitoringActive: boolean
  rollbackVersionAvailable: boolean
  biasReviewStatus: 'passed' | 'pending' | 'flagged'
}

export interface AuditEvent {
  id: string
  ts: string
  actor: string
  action: string
  target: string
  outcome: 'success' | 'warning' | 'failure'
  detail: string
  ipAddress?: string
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

export type ApprovalState = 'draft' | 'reviewed' | 'approved' | 'rejected'

export interface DispatchRecommendation {
  id: string
  ts: string
  horizon: string
  totalForecastMw: number
  riskAdjustedMw: number
  confidenceAdjustedMw: number
  storageAction: 'charge' | 'discharge' | 'hold'
  curtailmentRisk: 'low' | 'medium' | 'high'
  weatherRisk: 'low' | 'medium' | 'high'
  revenueImpactK: number
  approvalState: ApprovalState
  reviewer?: string
  auditTs?: string
  assets: Array<{ assetId: string; name: string; expectedMw: number; riskMw: number }>
}

export interface DecisionTrace {
  inputSources: string[]
  modelResult: string
  constraints: string[]
  recommendedAction: string
  humanReviewer: string
  auditTs: string
}

// ─── Architecture / Cloud Status ─────────────────────────────────────────────

export type ServiceHealth = 'healthy' | 'degraded' | 'down' | 'unknown'

export interface ArchitectureStatus {
  serviceName: string
  label: string
  awsAnalog: string
  health: ServiceHealth
  latencyMs: number | null
  queueDepth?: number
  deploymentTarget: 'aws-ready' | 'local-demo' | 'containerized'
  lastChecked: string
  detail: string
}

// ─── Executive Overview ──────────────────────────────────────────────────────

export interface ExecutiveSummary {
  asOf: string
  portfolioOutputMw: number
  forecastNext24hMwh: number
  forecastNext7dMwh: number
  actualVsExpectedPct: number
  revenueImpactK: number
  availabilityPct: number
  curtailmentMw: number
  outageMw: number
  modelConfidence: number     // 0–1
  dataQualityScore: number    // 0–100
  recommendedAction: string
  decisionBrief: string
}
