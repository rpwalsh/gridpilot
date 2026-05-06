/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useState } from 'react'
import axios from 'axios'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'

type ForecastResult = {
  p10_kw: number
  p50_kw: number
  p90_kw: number
}

export default function GenerationForecast() {
  const [result, setResult] = useState<ForecastResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [windSpeed, setWindSpeed] = useState('8')
  const [capacity, setCapacity] = useState('2000')
  const [assetType, setAssetType] = useState('wind_turbine')
  const [ghi, setGhi] = useState('700')

  const runForecast = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload: Record<string, number | string> = {
        site_id: 'demo_site',
        asset_type: assetType,
        capacity_kw: Number(capacity),
      }
      if (assetType === 'wind_turbine') payload.wind_speed_mps = Number(windSpeed)
      if (assetType === 'solar_inverter') {
        payload.ghi_wm2 = Number(ghi)
        payload.temperature_c = 25
      }
      const r = await axios.post('/api/v1/forecasts/site', payload)
      setResult(r.data)
    } catch {
      setResult(null)
      setError('Forecast unavailable')
    }
    setLoading(false)
  }

  const chartData = result ? [result.p10_kw, result.p50_kw, result.p90_kw] : []
  const spread = result ? result.p90_kw - result.p10_kw : 0

  return (
    <Box className="gp-grid">
      <Typography variant="h5" sx={{ fontWeight: 800 }}>Forecast</Typography>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5, alignItems: 'end' }}>
            <FormControl size="small">
              <InputLabel>asset_type</InputLabel>
              <Select
                label="asset_type"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
              >
                <MenuItem value="wind_turbine">wind_turbine</MenuItem>
                <MenuItem value="solar_inverter">solar_inverter</MenuItem>
              </Select>
            </FormControl>

            <TextField size="small" label="capacity_kw" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />

            {assetType === 'wind_turbine' ? (
              <TextField size="small" label="wind_speed_mps" type="number" value={windSpeed} onChange={(e) => setWindSpeed(e.target.value)} />
            ) : (
              <TextField size="small" label="ghi_wm2" type="number" value={ghi} onChange={(e) => setGhi(e.target.value)} />
            )}

            <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-start' } }}>
              <Button variant="contained" onClick={runForecast} disabled={loading} fullWidth>
                {loading ? 'running' : 'run'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
            <Card variant="outlined"><CardContent><Typography variant="caption">p10_kw</Typography><Typography variant="h5">{Math.round(result.p10_kw)}</Typography></CardContent></Card>
            <Card variant="outlined"><CardContent><Typography variant="caption">p50_kw</Typography><Typography variant="h5">{Math.round(result.p50_kw)}</Typography></CardContent></Card>
            <Card variant="outlined"><CardContent><Typography variant="caption">p90_kw</Typography><Typography variant="h5">{Math.round(result.p90_kw)}</Typography></CardContent></Card>
            <Card variant="outlined"><CardContent><Typography variant="caption">band_kw</Typography><Typography variant="h5">{Math.round(spread)}</Typography></CardContent></Card>
          </Box>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>forecast_distribution_kw</Typography>
              <BarChart
                height={280}
                xAxis={[{ scaleType: 'band', data: ['p10', 'p50', 'p90'] }]}
                series={[{ data: chartData, label: 'kw' }]}
                margin={{ left: 45, right: 10, top: 20, bottom: 35 }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}
