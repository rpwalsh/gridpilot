# Decision Trace

## Overview

Every inference response from GridForge includes a `decision_trace` object that fully documents the reasoning chain that produced the result.

## Structure

```json
{
  "trace_id": "trace_9f3a2c1b8e4d",
  "created_utc": "2024-01-15T12:34:56.789012",
  "steps": [
    {
      "step": "validate_wind_signal",
      "inputs": {"wind_speed_mps": 10.5, "source": "open_meteo"},
      "output": {"confidence": 1.0, "is_anomalous": false},
      "reasoning": "Signal within valid range [0, 100]"
    },
    {
      "step": "compute_expected_output",
      "inputs": {"wind_speed_mps": 10.5, "capacity_kw": 2000},
      "output": 1780.4,
      "reasoning": "Cubic power curve in rated region"
    },
    {
      "step": "compute_residual",
      "inputs": {"observed_kw": 400, "expected_kw": 1780.4},
      "output": {"residual_kw": -1380.4, "residual_pct": -77.5},
      "reasoning": "Significant negative residual detected (threshold: 15%)"
    }
  ],
  "model_versions": {
    "gridforge_predictive": "0.1.0"
  }
}
```

## Trace ID Format

```python
trace_id = f"trace_{uuid.uuid4().hex[:12]}"
```

Provides 48 bits of randomness — sufficient for collision-free identification in operational volumes.

## Audit Lookup

Traces are stored in the API's in-memory audit log and retrievable via:

```
GET /api/v1/audit/trace/{trace_id}
```

For production deployments, replace the in-memory store with a time-series or document database keyed on `trace_id`.

## Non-JSON Output Serialization

The `output` field of a `TraceStep` may contain non-JSON-native types (Pydantic models, dataclasses). These are serialized via `str()` when `to_dict()` is called, ensuring the trace is always JSON-serializable.
