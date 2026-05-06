# Predictive Mathematics Core

## What this is for

DispatchLayer is a read-only data display for power engineers and plant operations. It renders what is happening at your sites, what the data quality is, and how current conditions compare against forecast bands and historical baselines. Every pipeline execution produces a full audit trace so any past analysis can be replayed.

The predictive core does not use machine learning or black-box models. Every number it produces comes from a deterministic chain of evidence-weighted computations. Given the same inputs, the system always produces the same output and the same trace.

---

## The three-layer pipeline (L → G → P)

When you call `POST /api/v1/sites/evaluate`, DispatchLayer runs three sequential layers:

```
Raw signals (weather, telemetry, grid, market)
        ↓
L — Local Signal Scoring
        ↓
G — Structural Summarization
        ↓
P — Predictive Evolution
        ↓
Forecast bands + audit trace
```

### L — Local Signal Scoring

**What it does:** Takes each raw measurement (wind speed, GHI, temperature, grid demand, asset output, SOC, price) and scores the interaction it has with the asset at this moment in time.

**Key output:** A dictionary of scored signal interactions keyed by site. Each entry has `score`, `confidence`, and `observed_at`.

### G — Structural Summarization

**What it does:** Compresses the scored signals into a site-level state object: expected generation rate, effective capacity factor, dominant signal, and a structural health indicator.

**Key output:** `SiteStructuralState` with `expected_output_mw`, `capacity_factor`, `structural_confidence`, and `dominant_signal`.

### P — Predictive Evolution

**What it does:** Takes the structural state and forecasts how it will evolve across the operating window. Produces probabilistic bounds (p10/p50/p90) and a three-term error decomposition.

The three terms tell you *where* forecast uncertainty comes from:

| Error term | Symbol | Source |
|---|---|---|
| Structural error | ε_G | Site model vs. current asset/weather conditions |
| Predictive error | ε_P | Extrapolation uncertainty grows with forecast horizon |
| Observational noise | ε_obs | Irreducible measurement noise in source data |

**Key output:** `SitePrediction` with `p10_mwh`, `p50_mwh`, `p90_mwh`, and the three error terms.

---

## Signal State

Each raw measurement is lifted into a `SignalState`:

```
SignalState = {value, source, timestamp, is_anomalous, is_missing, confidence}
```

Confidence starts at 1.0. It is reduced at each stage if the value is missing, out of range, or conflicts with other sources. Every step is recorded in the audit trace.

---

## Evidence Weighting

Confidence scores are combined using the geometric mean across N independent signals:

```
confidence_combined = (c₁ × c₂ × ... × cₙ)^(1/N)
```

The geometric mean penalizes any single very-low confidence signal more strongly than the arithmetic mean. One bad signal cannot be hidden by three good readings.

---

## Validity Constraints

Values outside these ranges are flagged as anomalous. Anomalous signals get a confidence cap of 0.3 — they are still used in the calculation, but they carry much less weight.

| Signal | Min | Max | Anomaly confidence cap |
|--------|-----|-----|------------------------|
| wind_speed_mps | 0 | 100 | 0.3 |
| temperature_c | −60 | 60 | 0.3 |
| cloud_cover_pct | 0 | 100 | 0.3 |
| output_kw | 0 | 10⁹ | 0.3 |
| soc_pct | 0 | 100 | 0.3 |
| ghi_wm2 / dni_wm2 | 0 | 1400 | 0.3 |

---

## Worked example: solar site, summer afternoon

**Inputs:**
- Site: 50 MW solar, Mojave Desert
- GHI: 720 W/m², temperature: 41°C
- Grid demand: 28,500 MW
- Forecast residual: −11% (site running below model expectation)
- SOC: 65%, price: $72/MWh

**What the layers produce:**

1. **L** scores GHI × temperature interaction: high irradiance but temperature derating is active. Solar score is strong but slightly discounted for heat. Market signal score is elevated (high price + high demand).

2. **G** builds site state: expected output ~42 MW (capacity factor 0.84 after temperature derating). Structural confidence 0.91 (all signals fresh, no provider degradation).

3. **P** forecasts 24-hour window: p50 = 38 MWh. Spread is p10 = 32 / p90 = 44. ε_G is the dominant term because the −11% residual suggests the structural model is underestimating derating. Trust score: 0.79.

---

## Related documentation

- [Confidence Scoring](confidence-scoring.md) — how trust scores are computed
- [Residual Analysis](residual-analysis.md) — how expected-vs-actual gaps are measured
- [Causal Attribution](causal-attribution.md) — how the system ranks likely causes of underperformance
- [Forecast Reconciliation](forecast-reconciliation.md) — how multiple data sources are blended
- [Audit Trace](decision-trace.md) — how to replay any past analysis
