# Predictive Mathematics Core

## What this is for

DispatchLayer is a tool for power engineers. It tells you what is happening at your sites right now, why it is happening, and what you should do about it. It can also replay any past decision so you can understand what the system saw, what it concluded, and whether it was right.

The predictive core does not use machine learning or black-box models. Every number it produces comes from a deterministic chain of evidence-weighted computations. Given the same inputs, the system always produces the same output and the same trace explaining that output. You can audit every recommendation.

---

## The four-layer pipeline (L → G → P → D)

When you call `POST /api/v1/sites/evaluate`, DispatchLayer runs four sequential layers:

```
Raw signals (weather, telemetry, grid, market)
        ↓
L — Local Signal Scoring
        ↓
G — Structural Summarization
        ↓
P — Predictive Evolution
        ↓
D — Decision Ranking
        ↓
Ranked recommendations + audit trace
```

### L — Local Signal Scoring

**What it does:** Takes each raw measurement (wind speed, GHI, temperature, grid demand, asset output, SOC, price) and scores the interaction it has with the asset at this moment in time.

**Why it matters to you:** A 15 m/s wind reading from three hours ago is less operationally relevant than a 12 m/s reading from five minutes ago. Each interaction type has its own decay rate — weather observations decay faster than long-term market price signals, which decay slower. The layer produces a scored set of signals, each with a confidence and an age-adjusted relevance weight.

**Key output:** A dictionary of scored signal interactions keyed by site. Each entry has `score`, `confidence`, and `observed_at`.

### G — Structural Summarization

**What it does:** Compresses the scored signals into a site-level state object: expected generation rate, effective capacity factor, dominant signal, and a structural health indicator.

**Why it matters to you:** This layer is the boundary between provider-specific data shapes and the predictive engine. A weather measurement from Open-Meteo and one from NOAA/NWS are both converted to the same `SiteStructuralState` before the forecasting layer ever sees them. Provider outages or degraded sources affect structural confidence, which appears in your forecast trust score.

**Key output:** `SiteStructuralState` with `expected_output_mw`, `capacity_factor`, `structural_confidence`, and `dominant_signal`.

### P — Predictive Evolution

**What it does:** Takes the structural state and forecasts how it will evolve across the operating window. Produces probabilistic bounds (p10/p50/p90) and a three-term error decomposition.

**Why it matters to you:** The three terms tell you *why* the forecast might be wrong:

| Error term | Symbol | What it means |
|---|---|---|
| Structural error | ε_G | The site model may not fully represent current asset or weather conditions |
| Predictive error | ε_P | Extrapolation uncertainty grows with forecast horizon |
| Observational noise | ε_obs | Irreducible measurement noise in the source data |

The dominant term tells you where to focus if you want to improve forecast accuracy for this site.

**Key output:** `SitePrediction` with `p10_mwh`, `p50_mwh`, `p90_mwh`, and the three error terms.

### D — Decision Ranking

**What it does:** Converts the site prediction into ranked operational recommendations. Each recommendation has a `why_now` explanation, a `risk_if_ignored` statement, a confidence score, urgency tier, and estimated business impact in MWh or USD.

**Why it matters to you:** You do not have to interpret raw numbers. The ranker surfaces the most operationally important action first. Recommendations with urgency `IMMEDIATE` require attention within the dispatch window. Recommendations with urgency `ADVISORY` are informational for planning.

**Key output:** A ranked list of `OperationalRecommendation` objects ordered by confidence × urgency × estimated value.

---

## Signal State

Each raw measurement is lifted into a `SignalState`:

```
SignalState = {value, source, timestamp, is_anomalous, is_missing, confidence}
```

Confidence starts at 1.0. It is reduced at each stage if the value is missing, out of range, or conflicts with other sources. You see the final aggregate trust score on the response — but every step is recorded in the audit trace so you can see exactly where confidence was lost.

---

## Evidence Weighting

Confidence scores are combined using the geometric mean across N independent signals:

```
confidence_combined = (c₁ × c₂ × ... × cₙ)^(1/N)
```

The geometric mean penalizes any single very-low confidence signal more strongly than the arithmetic mean. If one sensor is reading garbage, the combined confidence drops sharply — it cannot be hidden by three good readings. This is the behavior you want in operations: one bad signal is a warning, not a minor statistical footnote.

---

## Validity Constraints

Values outside these ranges are flagged as anomalous. Anomalous signals get a confidence cap of 0.3 — they are still used in the calculation, but they carry much less weight and the situation is surfaced to you.

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

4. **D** ranks recommendations:
   - `[IMMEDIATE]` Investigate temperature derating — module temperature may exceed datasheet operating range, confidence 0.84
   - `[ADVISORY]` Dispatch battery at current price level before peak demand subsides, confidence 0.71

---

## Related documentation

- [Confidence Scoring](confidence-scoring.md) — how trust scores are computed and what they mean
- [Residual Analysis](residual-analysis.md) — how expected-vs-actual gaps are measured and acted on
- [Causal Attribution](causal-attribution.md) — how the system ranks likely causes of underperformance
- [Forecast Reconciliation](forecast-reconciliation.md) — how multiple data sources are blended
- [Decision Trace](decision-trace.md) — how to replay any past recommendation
- [Operator Guide](../operator-guide.md) — practical guide for live situational awareness
- [Replay and Audit](../replay-and-audit.md) — post-event investigation workflow
