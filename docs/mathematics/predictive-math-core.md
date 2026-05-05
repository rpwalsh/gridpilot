# Predictive Mathematics Core

## Overview

GridForge's predictive analytics engine implements Walsh's deterministic evidence-weighted reasoning, a framework for combining multiple uncertain data sources into calibrated probabilistic forecasts with full auditability.

## Core Principle

Every inference is the result of a deterministic chain of evidence-weighted computations. Given the same inputs, the system always produces the same output and the same trace explaining that output.

## Signal State

Each raw measurement is lifted into a `SignalState` (see `signal_state.py`):

```
SignalState = {value, source, timestamp, is_anomalous, is_missing, confidence}
```

Confidence is initialized to 1.0 and degraded by downstream checks.

## Evidence Weighting

Confidence scores are combined using the geometric mean across N independent signals:

```
confidence_combined = (c₁ × c₂ × ... × cₙ)^(1/N)
```

The geometric mean penalizes any single very-low confidence signal more strongly than the arithmetic mean, preventing a single reliable source from masking an unreliable one.

## Validity Constraints

| Signal | Min | Max | Anomaly confidence cap |
|--------|-----|-----|------------------------|
| wind_speed_mps | 0 | 100 | 0.3 |
| temperature_c | −60 | 60 | 0.3 |
| cloud_cover_pct | 0 | 100 | 0.3 |
| output_kw | 0 | 10⁹ | 0.3 |
| soc_pct | 0 | 100 | 0.3 |
| ghi_wm2 / dni_wm2 | 0 | 1400 | 0.3 |
