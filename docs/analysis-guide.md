# Analysis Guide — Dispatch Layer

Dispatch Layer is a SCADA analysis console for renewable and grid-connected assets.

This guide explains what the system analyzes, how to read the outputs, and what each piece of analysis means from an engineering perspective.

---

## What the System Does

Dispatch Layer ingests an operational snapshot — site coordinates, asset type, capacity, and available signal values (weather, telemetry, grid context) — and runs it through an analysis pipeline that produces:

1. **A forecast context envelope** (P10/P50/P90 production range)
2. **A data-quality confidence score** with three-term decomposition
3. **A structural drift assessment** comparing recent residuals to baseline
4. **A complete audit trace** showing every input, calculation, and intermediate output

It does not issue commands, prescribe operator actions, or generate scripted responses. It surfaces what the data shows and what the analysis derived from it.

---

## The Analysis Pipeline

The pipeline runs four stages on every snapshot:

```
L — Signal Scoring        (inputs: weather, grid, telemetry, market signals)
        ↓
G — Structural State      (output: capacity factor estimate, data quality, derating risk)
        ↓
P — Forecast Context      (output: P10/P50/P90 MWh, trust score, error decomposition)
        ↓
Drift Detection           (output: regime-shift risk assessment)
        ↓
Audit Trace               (output: full inspection record)
```

Each stage is documented below.

---

## Stage L: Signal Scoring

Signal scoring converts raw input values into typed, time-decayed interaction scores.

Each signal type decays at its own rate:

| Signal Type | Typical Half-Life |
|-------------|------------------|
| Wind speed | 2 hours |
| Solar irradiance | 1 hour |
| Grid demand | 4 hours |
| Forecast residual | 6 hours |
| Battery SoC | 1 hour |

A signal observed 4 hours ago contributes less confidence to the analysis than one observed 10 minutes ago. This prevents stale inputs from being treated with the same weight as fresh ones.

**What this means for engineers:** If input telemetry is stale, the confidence scores going into the structural state will be lower. The audit trace shows which signals were fresh and which were aged.

---

## Stage G: Structural State

Structural state compresses signal scores into three site-level quantities:

| Field | Meaning |
|-------|---------|
| `capacity_factor_estimate` | Fraction of nameplate capacity expected to be active given current signals |
| `data_quality` | 0–1 measure of signal completeness and freshness |
| `derating_risk` | 0–1 estimate of the probability that the site is running below expected capacity |

**What this means for engineers:**

- A `data_quality` of 0.95 means signals are fresh and mostly complete.
- A `data_quality` of 0.50 means significant signals are stale, missing, or in disagreement — the forecast context should be treated as degraded.
- A `derating_risk` of 0.60 with a negative residual suggests the site may be operating below expected output for the current conditions.

---

## Stage P: Forecast Context

The forecast context produces a P10/P50/P90 production envelope for the analysis window.

### Reading the Envelope

| Band | Meaning |
|------|---------|
| P50 | Expected production given current signals and structural state |
| P10 | Pessimistic bound — 10th percentile outcome |
| P90 | Optimistic bound — 90th percentile outcome |

The width of the P10–P90 band reflects total uncertainty. A narrow band means high confidence. A wide band means the combination of structural uncertainty, forecast horizon, and signal noise is large.

### Data-Quality Confidence Score

The confidence score is a single number (0–1) derived from three contributing terms:

| Term | Meaning |
|------|---------|
| `structural_error` ε_G | How well the site model represents actual site behavior |
| `predictive_error` ε_P | Model extrapolation error over the forecast horizon |
| `observational_noise` ε_obs | Irreducible noise in the source data |

The score is:

```
trust = 1 − (ε_G + ε_P + ε_obs)
```

**Reading the grade:**

| Grade | Score | Meaning |
|-------|-------|---------|
| `high` | > 0.80 | Signals are fresh, complete, and internally consistent |
| `medium` | 0.60–0.80 | Minor data gaps or short forecast horizon — use with awareness |
| `low` | 0.40–0.60 | Significant stale or missing inputs — treat envelope as indicative |
| `very_low` | < 0.40 | Data quality is insufficient for reliable analysis — check provider status |

### Dominant Error Term

The `dominant_term` field identifies which of the three error components is largest. This helps engineers understand *why* confidence is degraded:

| Dominant Term | Typical Cause | Engineering Action |
|---------------|---------------|-------------------|
| `structural_error` | Site model doesn't match actual asset behavior | Review asset metadata, capacity, and type |
| `predictive_error` | Forecast horizon is long or state uncertainty is high | Reduce window or wait for fresher signals |
| `observational_noise` | Source data is stale, missing, or noisy | Check provider status and telemetry freshness |

---

## Structural Drift Detection

Drift detection compares recent residuals against a trailing baseline to detect whether the forecast model has shifted from its calibrated operating regime.

| Risk Level | Meaning |
|------------|---------|
| `none` | Recent behavior is consistent with baseline |
| `moderate` | Statistically significant shift detected — review inputs |
| `critical` | Large shift — site behavior may have structurally changed |

Drift does not mean something is wrong. It means the relationship between input signals and output has changed from the recent baseline — which may reflect a real physical change (e.g., new curtailment pattern, seasonal shift, maintenance effect) or a data quality issue (e.g., stale irradiance data, provider change).

---

## What the Audit Trace Shows

Every analysis run produces a full audit trace recording each pipeline step's inputs, outputs, and reasoning. The trace is returned in the API response and displayed in the dashboard timeline.

Engineers can use the trace to:

- Verify which signal values were used (and their source)
- Inspect how confidence was computed at each stage
- Understand why the structural state was what it was
- Confirm which providers were live vs. fixture at the time of analysis

See `docs/replay-and-audit.md` for instructions on using traces for post-event analysis.

---

## Provider Data Modes

| Mode | Meaning |
|------|---------|
| `live` | Calls real public provider APIs for weather, solar, and grid data |
| `fixture` | Uses recorded offline SCADA capture — for local analysis and testing |
| `hybrid` | Live where providers are reachable; falls back to offline fixture |

The `sources` block in every response shows each provider's status, latency, freshness, and any degradation reason.

---

## Signal Quality Indicators

The dashboard and API response include provider-level status for each signal:

| Status | Meaning |
|--------|---------|
| `success` | Live provider returned fresh data |
| `fixture` | Offline capture was used |
| `degraded` | Live call failed; offline fixture was used as fallback |
| `unconfigured` | API key not set; provider not called |
| `error` | Provider returned an error in live mode |

Engineers should treat `degraded` and `unconfigured` signals as reduced-quality inputs and interpret the confidence score accordingly.
