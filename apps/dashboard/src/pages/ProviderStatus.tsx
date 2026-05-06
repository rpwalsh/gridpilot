/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Link,
  Typography,
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { BarChart } from '@mui/x-charts/BarChart'

const PROVIDER_DOCS: Record<string, { label: string; url: string; keyVar?: string }> = {
  open_meteo: { label: 'Open-Meteo', url: 'https://open-meteo.com/en/docs' },
  nasa_power: { label: 'NASA POWER', url: 'https://power.larc.nasa.gov/api/temporal/hourly/point' },
  noaa_nws: { label: 'NOAA/NWS', url: 'https://www.weather.gov/documentation/services-web-api' },
  eia: { label: 'EIA', url: 'https://www.eia.gov/opendata/', keyVar: 'DISPATCHLAYER_EIA_API_KEY' },
  nrel: { label: 'NREL', url: 'https://developer.nrel.gov/', keyVar: 'DISPATCHLAYER_NREL_API_KEY' },
  entsoe: {
    label: 'ENTSO-E',
    url: 'https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html',
    keyVar: 'DISPATCHLAYER_ENTSOE_API_KEY',
  },
}

type ProviderInfo = {
  status?: string
  latency_ms?: number
  degraded_mode?: string
}

type ProviderHealthResp = {
  providers: Record<string, ProviderInfo>
  warnings?: string[]
}

function statusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'success') return 'success'
  if (status === 'unconfigured' || status === 'degraded') return 'warning'
  if (status === 'error' || status === 'failed') return 'error'
  return 'default'
}

export default function ProviderStatus() {
  const [health, setHealth] = useState<ProviderHealthResp | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheckedUtc, setLastCheckedUtc] = useState<string | null>(null)

  const fetchHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get('/api/v1/providers/health')
      setHealth(r.data)
      setLastCheckedUtc(new Date().toISOString())
    } catch {
      setError('Source status unavailable')
      setHealth(null)
    }
    setLoading(false)
  }

  useEffect(() => { fetchHealth() }, [])

  const providers = health?.providers ?? {}
  const total = Object.keys(providers).length
  const live = Object.values(providers).filter((p) => p.status === 'success').length
  const unconfigured = Object.values(providers).filter((p) => p.status === 'unconfigured').length
  const warnings = health?.warnings ?? []

  const rows = Object.entries(providers).map(([name, info], idx) => {
    const doc = PROVIDER_DOCS[name]
    return {
      id: idx,
      provider: doc?.label ?? name,
      providerKey: name,
      status: info.status ?? 'unknown',
      latencyMs: info.latency_ms ?? null,
      degradedMode: info.degraded_mode ?? '',
      keyVar: doc?.keyVar ?? 'none',
      url: doc?.url ?? '',
    }
  })

  const columns: GridColDef[] = [
    {
      field: 'provider',
      headerName: 'Source',
      flex: 1.2,
      minWidth: 170,
      renderCell: (params) => {
        const url = String(params.row.url || '')
        return url ? (
          <Link href={url} target="_blank" rel="noopener" underline="hover">
            {String(params.value)}
          </Link>
        ) : (
          <>{String(params.value)}</>
        )
      },
    },
    {
      field: 'providerKey',
      headerName: 'Adapter',
      flex: 0.9,
      minWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {String(params.value)}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 130,
      renderCell: (params) => (
        <Chip
          size="small"
          label={String(params.value).replace(/_/g, ' ')}
          color={statusColor(String(params.value))}
          variant="outlined"
        />
      ),
    },
    {
      field: 'latencyMs',
      headerName: 'Latency ms',
      type: 'number',
      flex: 0.7,
      minWidth: 110,
      valueFormatter: (value) => (value == null ? 'n/a' : String(value)),
    },
    {
      field: 'degradedMode',
      headerName: 'Flags',
      flex: 1,
      minWidth: 180,
      valueFormatter: (value) => (value ? String(value) : 'none'),
    },
    {
      field: 'keyVar',
      headerName: 'Credential',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
          {String(params.value)}
        </Typography>
      ),
    },
  ]

  const chartNames = rows.map((r) => r.provider)
  const chartLatency = rows.map((r) => (r.latencyMs == null ? 0 : r.latencyMs))

  return (
    <Box className="gp-grid">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Source Status</Typography>
        <Button variant="outlined" size="small" onClick={fetchHealth} disabled={loading}>
          {loading ? 'Refreshing' : 'Refresh'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
        <Card variant="outlined"><CardContent><Typography variant="caption">sources</Typography><Typography variant="h5">{total}</Typography></CardContent></Card>
        <Card variant="outlined"><CardContent><Typography variant="caption">reachable</Typography><Typography variant="h5">{live}</Typography></CardContent></Card>
        <Card variant="outlined"><CardContent><Typography variant="caption">unconfigured</Typography><Typography variant="h5">{unconfigured}</Typography></CardContent></Card>
        <Card variant="outlined"><CardContent><Typography variant="caption">warnings</Typography><Typography variant="h5">{warnings.length}</Typography></CardContent></Card>
      </Box>

      {lastCheckedUtc && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          checked_utc: {lastCheckedUtc}
        </Typography>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>latency_ms_by_source</Typography>
          <BarChart
            height={240}
            xAxis={[{ scaleType: 'band', data: chartNames }]}
            series={[{ data: chartLatency, label: 'latency_ms' }]}
            margin={{ left: 40, right: 10, top: 20, bottom: 50 }}
          />
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>source_matrix</Typography>
          <Box sx={{ height: 460, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              disableRowSelectionOnClick
              hideFooterSelectedRowCount
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            />
          </Box>
        </CardContent>
      </Card>

      {warnings.length > 0 && <Alert severity="warning">{warnings.join(' | ')}</Alert>}
    </Box>
  )
}
