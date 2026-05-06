# DispatchLayer API Reference

Base URL: `http://localhost:8000/api/v1`

Interactive docs: `http://localhost:8000/docs`

## Endpoints

### Sites (Primary Entry Point)
- `POST /sites/evaluate` — **full L→G→P pipeline evaluation** for a single site

  Accepts site context signals (lat/lon, asset type, capacity, weather, grid demand, residuals) and returns:
  - Generation forecast with p10/p50/p90 bounds
  - Forecast trust score with three-term error decomposition (εG + εP + εobs)
  - Structural drift warning (regime-shift detection against trailing residuals)
  - Step-by-step audit trace (`trace_id`, model versions, per-step method)

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
- `POST /ingest/weather` — fetch and normalize weather data from a provider

### Forecasts
- `POST /forecasts/site` — generate site-level generation forecast
- `POST /forecasts/portfolio` — generate portfolio-level forecast with p10/p50/p90

### Anomalies
- `POST /anomalies/detect` — detect deviations in asset telemetry
- `GET /anomalies/conditions` — list anomaly condition types

### Dispatch
- `POST /dispatch/optimize` — compute battery storage state for dispatch window

### Predictive Operations Core
- `POST /predictive/signal-state` — normalize and validate signal state
- `POST /predictive/residual` — compute production residual
- `POST /predictive/forecast-bounds` — compute p10/p50/p90 bounds
- `POST /predictive/reconcile` — reconcile forecast with historical errors
- `POST /predictive/causal-attribution` — attribute underproduction cause
- `POST /predictive/confidence` — compute evidence graph confidence

### Signals
- `POST /signals/evaluate` — evaluate signal events and threshold states

### Connectors
- `GET /connectors/state` — connector matrix (OPC UA / MQTT / SiteWise / OTel / Parquet)
- `GET /connectors/protocols` — list supported connector protocols

### Audit
- `GET /audit/trace/{trace_id}` — look up audit trace by ID

### Health
- `GET /health` — service health check
- `GET /api/v1/health` — versioned health check

## Response Format

All inference responses include an `audit_trace` object:

```json
{
  "result": { ... },
  "audit_trace": {
    "trace_id": "trace_abc123",
    "created_utc": "2024-01-15T10:00:00+00:00",
    "model_versions": { "predictive_core": "0.1.0" },
    "steps": [
      {
        "step": "L_local_signal_scoring",
        "inputs": { "data_mode": "hybrid", "wind_speed_mps": 9.1 },
        "output": { "interactions_scored": 4 },
        "method": "exponential_decay_typed_interactions"
      }
    ]
  }
}
```

## Product boundary

Dispatch Layer is read-only. The API does not:
- Generate operator instructions or automated language output
- Return prose response fields or control flags
- Issue commands or write setpoints
- Run language models or automated response engines

All responses are structured data: numbers, enums, timestamps, IDs, and audit records.
