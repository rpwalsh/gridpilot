# GridForge API Reference

Base URL: `http://localhost:8000/api/v1`

## Endpoints

### Providers
- `GET /providers` — list configured providers and their status
- `GET /providers/health` — health check for all providers

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

### Predictive Core (Walsh)
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

## Response Format

All inference responses include:
```json
{
  "result": { ... },
  "decision_trace": {
    "trace_id": "trace_abc123",
    "created_utc": "2024-01-15T10:00:00+00:00",
    "steps": [...],
    "model_versions": {...}
  }
}
```
