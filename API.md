# DispatchLayer API Reference

Base URL: `http://localhost:8000/api/v1`

Interactive docs: `http://localhost:8000/docs`

## Endpoints

### Sites (Primary Entry Point)
- `POST /sites/evaluate` — **full L→G→P→D pipeline evaluation** for a single site

  Accepts site context signals (lat/lon, asset type, capacity, weather, grid demand, residuals) and returns:
  - Generation forecast with p10/p50/p90 bounds
  - Forecast trust score with three-term error decomposition (εG + εP + εobs)
  - Structural drift warning (regime-shift detection against trailing residuals)
  - Ranked operational recommendations with `why_now`, `risk_if_ignored`, and estimated value
  - Step-by-step audit trace (`trace_id`, model versions, per-step reasoning)

  ```json
  POST /api/v1/sites/evaluate
  {
    "name": "site_01",
    "latitude": 44.95,
    "longitude": -93.09,
    "asset_type": "solar",
    "capacity_mw": 50.0,
    "window_hours": 24,
    "ghi_wm2": 650.0,
    "temperature_c": 22.0,
    "grid_demand_mw": 28000.0,
    "forecast_residual_pct": -8.5,
    "trailing_residuals": [-2, -1, 3, 1, -3],
    "current_soc_pct": 72.0,
    "price_per_mwh": 55.0
  }
  ```

### Providers
- `GET /providers` — list configured providers and their status
- `GET /providers/health` — health check for all providers

### Ingest
- `POST /ingest/weather` — fetch and normalize weather forecast from a provider

### Forecasts
- `POST /forecasts/site` — generate site-level generation forecast
- `POST /forecasts/portfolio` — generate portfolio-level forecast with p10/p50/p90

### Anomalies
- `POST /anomalies/detect` — detect anomalies in asset telemetry
- `GET /anomalies/conditions` — list anomaly condition types

### Recommendations
- `POST /recommendations/generate` — generate ranked operational recommendations
- `GET /recommendations/types` — list recommendation types

### Dispatch
- `POST /dispatch/optimize` — optimize battery dispatch action

### Predictive Operations Core
- `POST /predictive/signal-state` — normalize and validate signal state
- `POST /predictive/residual` — compute production residual
- `POST /predictive/forecast-bounds` — compute p10/p50/p90 bounds
- `POST /predictive/reconcile` — reconcile forecast with historical errors
- `POST /predictive/causal-attribution` — attribute underproduction cause
- `POST /predictive/confidence` — compute evidence graph confidence

### Audit
- `GET /audit/trace/{trace_id}` — retrieve decision trace by ID

### Health
- `GET /health` — service health check
- `GET /api/v1/health` — versioned health check

## Response Format

All inference responses include:
```json
{
  "result": { ... },
  "decision_trace": {
    "trace_id": "trace_abc123",
    "created_utc": "2024-01-15T10:00:00+00:00",
    "steps": [...],
    "model_versions": {}
  }
}
```
