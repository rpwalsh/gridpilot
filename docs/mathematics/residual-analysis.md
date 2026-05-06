# Residual Analysis

## What a residual tells you

A residual is the gap between what a site is actually producing and what it should be producing given current weather and asset conditions. It is the most direct indicator of a problem.

A residual of −25% on a solar site during peak irradiance hours means the site is generating 25% less than the physics says it should. That gap has a cause — soiling, shading, inverter derating, sensor fault, curtailment — and DispatchLayer's causal attribution layer will rank the likely explanations.

A positive residual (site outperforming the model) is also worth attention. It often means the irradiance model is lagging a clear-sky improvement, a curtailment has lifted, or there is a sensor reading incorrectly on the high side.

---

## Definition

```
residual_kw  = observed_kw − expected_kw
residual_pct = 100 × (observed_kw − expected_kw) / expected_kw
```

A negative residual means the site is underperforming. A positive residual means the site is outperforming the model.

---

## Significance Threshold

A residual is considered significant when:

```
|residual_pct| > threshold_pct   (default: 15%)
```

Below 15%, normal variance in weather data, sensor noise, and model approximation accounts for the gap. Above 15%, something operationally meaningful is happening and causal attribution is triggered.

---

## Wind Turbine Expected Output

Expected output is computed from the standard IEC 61400-1 wind power curve model:

| Wind speed | Model |
|---|---|
| Below cut-in (< 3 m/s) | 0 kW |
| Cut-in to rated (3–12 m/s) | `capacity × (v − v_cut_in)³ / (v_rated − v_cut_in)³` |
| Rated to cut-out (12–25 m/s) | `capacity_kw` (fully rated) |
| Above cut-out (> 25 m/s) | 0 kW (protection shutdown) |

The cubic polynomial in the ramp region is the standard IEC power curve shape. Real turbines deviate from it due to blade degradation, yaw misalignment, wake effects, and icing — and that deviation is exactly what the residual measures.

---

## Solar Inverter Expected Output

Based on a PVWatts-style irradiance-temperature model:

```
dc_output = ghi_wm2 × derating_factor × (1 + temp_coefficient × (temperature_c − 25))
ac_output = dc_output / dc_ac_ratio × system_efficiency
```

Where:
- `temp_coefficient = −0.004 /°C` — standard crystalline silicon temperature coefficient
- `system_efficiency = 0.86` — accounts for ~14% combined losses (wiring, mismatch, inverter partial load)
- `dc_ac_ratio = 1.2` — standard PVWatts assumption for utility-scale systems

For every 1°C above 25°C, you lose 0.4% of DC output. At 45°C (a typical summer afternoon in desert locations), that is an 8% derating before any other losses.

---

## Operator action matrix

Use this table to determine how to respond to a detected residual. The system will generate specific recommendations, but this gives you the operational framing.

| Residual | Magnitude | Likely cause | First check |
|---|---|---|---|
| Negative | 15–30% | Weather model lag, soiling, minor derating | Check irradiance vs model, review soiling history |
| Negative | 30–60% | Inverter fault, partial curtailment, clipping, icing (wind) | Check SCADA alarms, review curtailment log |
| Negative | > 60% | Full curtailment, protection shutdown, major equipment fault | Check curtailment dispatch, review protection relay log |
| Positive | 15–30% | Clear-sky model lag, sensor reading high | Check GHI sensor calibration, compare to adjacent site |
| Positive | > 30% | Sensor fault (irradiance high), capacity model error | Flag for sensor inspection; do not dispatch on optimistic forecast |

---

## Structural drift

DispatchLayer tracks the trailing residuals over the recent operating window. If residuals consistently run in the same direction (e.g., the last eight intervals all show −8% to −14%), a structural drift warning is issued:

```json
{
  "structural_drift": {
    "detected": true,
    "direction": "negative",
    "mean_trailing_residual_pct": -10.2,
    "warning": "Persistent underperformance bias detected. Review asset model parameters or check for unreported curtailment."
  }
}
```

Structural drift is different from a single-interval residual. A single negative residual may be a cloud passing. Persistent drift means the model's expectation of what this site should produce has diverged from reality — the site model, the weather signal, or the asset itself has changed.

---

## Worked example: wind site, early morning

**Situation:** West Texas wind farm, 80 MW. Wind speed 9.5 m/s (well into the rated ramp region). Observed output: 28 MW. Expected: 51 MW. Residual: −45%.

**System response:**
1. Residual flagged as significant (|−45%| > 15% threshold).
2. Causal attribution triggered — top hypotheses: `wake_effect` (conf 0.72), `yaw_misalignment` (conf 0.58).
3. Trust score adjusted: structural error term rises to 0.18 (above normal) because the model expectation is substantially wrong.
4. Recommendation generated: `[IMMEDIATE]` Investigate turbine yaw alignment and upstream wake profile before next dispatch window.

---

## Related documentation

- [Causal Attribution](causal-attribution.md) — how the system ranks likely causes once a residual is detected
- [Confidence Scoring](confidence-scoring.md) — how residuals affect trust score
- [Predictive Math Core](predictive-math-core.md) — the full L→G→P→D pipeline
- [Operator Guide](../operator-guide.md) — live situational awareness for power engineers
