/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

interface SourceRecordPanelProps {
  provider?: string
  sourceType?: string
  datasetId?: string
  siteName?: string
  capturedAt?: string
  records?: number
  startDate?: string
  endDate?: string
  cadence?: string
  contentHash?: string
  schemaVersion?: string
  quality?: {
    good: number
    missing: number
    stale: number
    other: number
  }
}

export default function SourceRecordPanel({
  provider = 'NREL PVDAQ',
  sourceType = 'PV System Performance',
  datasetId = 'pvdaq_site_001',
  siteName = 'AZ_Tucson_1MW',
  capturedAt = '2026-05-05T00:00:00Z',
  records = 184201,
  startDate = '2018-01-01 00:00:00Z',
  endDate = '2020-12-31 23:59:59Z',
  cadence = '5 minute',
  contentHash = 'a3f0...44d8b8f204',
  schemaVersion = 'dispatchlayer.schema.v1',
  quality = { good: 986.7, missing: 0.9, stale: 0.4, other: 0.0 },
}: SourceRecordPanelProps) {
  return (
    <div className="source-record-panel">
      <h4 className="source-record-panel__title">SOURCE RECORD</h4>

      <div className="source-record-section">
        <div className="source-record-field">
          <div className="source-record-label">Provider</div>
          <div className="source-record-value">{provider}</div>
        </div>
        <div className="source-record-field">
          <div className="source-record-label">Source Type</div>
          <div className="source-record-value">{sourceType}</div>
        </div>
        <div className="source-record-field">
          <div className="source-record-label">Dataset ID</div>
          <div className="source-record-value">{datasetId}</div>
        </div>
        <div className="source-record-field">
          <div className="source-record-label">Site Name</div>
          <div className="source-record-value">{siteName}</div>
        </div>
        <div className="source-record-field">
          <div className="source-record-label">Captured At</div>
          <div className="source-record-value">{capturedAt}</div>
        </div>
      </div>

      <div className="source-record-section">
        <div className="source-record-field">
          <div className="source-record-label">Records</div>
          <div className="source-record-value">{records.toLocaleString()}</div>
        </div>
        <div className="source-record-field">
          <div className="source-record-label">Start</div>
          <div className="source-record-value">{startDate}</div>
        </div>
        <div className="source-record-field">
          <div className="source-record-label">End</div>
          <div className="source-record-value">{endDate}</div>
        </div>
        <div className="source-record-field">
          <div className="source-record-label">Cadence</div>
          <div className="source-record-value">{cadence}</div>
        </div>
      </div>

      <div className="source-record-section">
        <div className="source-record-field">
          <div className="source-record-label">Content Hash (SHA256)</div>
          <div className="source-record-value source-record-value--code">{contentHash}</div>
        </div>
        <div className="source-record-field">
          <div className="source-record-label">Schema Version</div>
          <div className="source-record-value source-record-value--code">{schemaVersion}</div>
        </div>
      </div>

      <div className="source-record-section">
        <h5 className="source-record-section-title">DATA QUALITY (summary)</h5>
        <div className="data-quality-grid">
          <div className="data-quality-item">
            <div className="data-quality-label">Good</div>
            <div className="data-quality-value" style={{ color: '#66bb6a' }}>
              {quality.good}%
            </div>
          </div>
          <div className="data-quality-item">
            <div className="data-quality-label">Missing</div>
            <div className="data-quality-value" style={{ color: '#ffa726' }}>
              {quality.missing}%
            </div>
          </div>
          <div className="data-quality-item">
            <div className="data-quality-label">Stale</div>
            <div className="data-quality-value" style={{ color: '#ef5350' }}>
              {quality.stale}%
            </div>
          </div>
          <div className="data-quality-item">
            <div className="data-quality-label">Other</div>
            <div className="data-quality-value" style={{ color: '#8b8b8b' }}>
              {quality.other}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
