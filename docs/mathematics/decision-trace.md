# Decision Trace

## Overview

Every analysis pipeline execution produces a `decision_trace` object that fully documents the reasoning chain: which inputs were used, what each pipeline step computed, and why.

Decision traces are the primary mechanism for post-event replay and engineering review. An engineer can take any trace ID, retrieve the trace, and inspect the exact state of every input, calculation, and intermediate output at the time of analysis.

---

## Structure

```json
{
  "trace_id": "trace_9f3a2c1b8e4d",
  "created_utc": "2024-01-15T12:34:56.789012",
  "model_versions": {
    "predictive_core": "0.1.0",
    "pipeline": "L→G→P"
  },
  "steps": [
    {
      "step": "L_local_signal_scoring",
      "inputs": {
        "data_mode": "hybrid",
        "wind_speed_mps": 9.1,
        "ghi_wm2": null,
        "grid_demand_mw": 28000,
        "forecast_residual_pct": -8.5
      },
      "output": { "interactions_scored": 4 },
      "reasoning": "Scored typed temporal interactions with per-type exponential decay"
    },
    {
      "step": "G_structural_summarization",
      "inputs": { "asset_type": "wind", "capacity_mw": 50.0 },
      "output": {
        "capacity_factor_estimate": 0.412,
        "data_quality": 0.87,
        "derating_risk": 0.14
      },
      "reasoning": "Compressed local scores into site structural state"
    },
    {
      "step": "P_predictive_evolution",
      "inputs": { "window_hours": 24 },
      "output": {
        "p50_mwh": 494.4,
        "forecast_trust": 0.81,
        "structural_error": 0.08,
        "predictive_error": 0.07,
        "observational_noise": 0.04
      },
      "reasoning": "Propagated structural state forward with P10/P50/P90 bounds and three-term error decomposition"
    },
    {
      "step": "structural_drift_detection",
      "inputs": { "recent_count": 1, "baseline_count": 0 },
      "output": { "risk": "none", "reason": "Insufficient baseline for comparison" },
      "reasoning": "Compared recent residuals against trailing baseline for regime-shift detection"
    }
  ]
}
```

---

## Pipeline Steps Recorded

| Step | What It Records |
|------|----------------|
| `L_local_signal_scoring` | Input signals (wind, irradiance, grid demand, residual), data mode, number of interactions scored |
| `G_structural_summarization` | Asset type, capacity, resulting capacity factor estimate, data quality, derating risk |
| `P_predictive_evolution` | Window hours, P50/P10/P90 MWh, trust score, three-term error decomposition |
| `structural_drift_detection` | Recent and baseline residual counts, drift risk level, reason |

Each step records its inputs and outputs verbatim so the trace is a complete reconstruction of the analysis state.

---

## Trace ID Format

```python
trace_id = f"trace_{uuid.uuid4().hex[:12]}"
```

48 bits of randomness — sufficient for collision-free identification at operational volumes.

---

## Retrieving a Trace

Traces are stored in the API's audit log and retrievable by ID:

```http
GET /api/v1/audit/traces
GET /api/v1/audit/trace/{trace_id}
```

In a production deployment, replace the in-memory store with a document or time-series database keyed on `trace_id`.

---

## Using Traces for Post-Event Replay

The audit trace is the primary tool for understanding what the system "saw" at a specific point in time.

To replay a past analysis:

1. Retrieve the trace from the audit log for the timestamp of interest.
2. Read the `L_local_signal_scoring` inputs — these are the exact signal values (weather, grid, residual) that were active at that moment, including which were from live providers and which fell back to fixture.
3. Read the `G_structural_summarization` output — this shows the site state the pipeline derived from those signals.
4. Read the `P_predictive_evolution` output — this shows the forecast and confidence that resulted from that structural state.
5. Read the `structural_drift_detection` output — this shows whether drift was flagged at that time.

This allows engineers to answer: *"What did the system see, and what did it compute, at 14:32 on 5 June?"*

---

## Output Serialization

The `output` field of each `TraceStep` may contain Pydantic models, dataclasses, or other non-JSON-native types. These are serialized via `str()` during `to_dict()`, ensuring traces are always JSON-serializable regardless of the intermediate computation types used internally.

---

## Implementation

See: `packages/predictive/src/dispatchlayer_predictive/decision_trace.py`
