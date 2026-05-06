# Causal Attribution

## Purpose

When a significant production residual is detected, causal attribution identifies the most likely physical causes and quantifies the confidence of each hypothesis.

This is not a recommendation engine. Causal attribution produces a ranked list of hypotheses — each hypothesis names a physical cause and gives a confidence score derived from the input signal values. The engineer decides what to do with that information.

---

## What It Produces

For a given deviation event, causal attribution returns a list of hypotheses sorted by confidence:

```json
{
  "hypotheses": [
    { "cause": "yaw_misalignment", "confidence": 0.58 },
    { "cause": "blade_degradation", "confidence": 0.47 }
  ]
}
```

Each hypothesis reflects a physical condition that would be consistent with the observed residual and input signals. No hypothesis is selected as "the answer" — all hypotheses above the confidence threshold are returned for engineering review.

---

## Wind Turbine Attribution

| Hypothesis | Triggering Condition | Base Confidence |
|------------|---------------------|-----------------|
| `wake_effect` | Wind 3–12 m/s AND residual < −30% | 0.72 |
| `blade_degradation` | Residual < −20% AND wind 3–25 m/s | 0.65 |
| `yaw_misalignment` | Residual −10% to −30% AND wind > 5 m/s | 0.58 |
| `icing` | Temperature < 2°C AND residual < −15% | 0.81 |
| `curtailment` | Residual < −50% | 0.70 |
| `sensor_fault` | Residual > 30% (overproduction) | 0.60 |

### Confidence Adjustment

Each hypothesis confidence is scaled by the input signal confidence:

```
c_hypothesis = c_base × c_signal
```

If the wind speed reading is stale or low-quality, hypothesis confidences are reduced proportionally. This means attribution confidence degrades gracefully when input telemetry is incomplete.

### Output

Hypotheses are returned sorted by confidence descending. The caller may filter to those above a threshold (default: 0.4).

---

## Solar Inverter Attribution

| Hypothesis | Triggering Condition | Base Confidence |
|------------|---------------------|-----------------|
| `soiling` | Residual < −15% | 0.68 |
| `shading` | Residual < −25% | 0.60 |
| `inverter_clipping` | Temperature > 35°C AND residual > 10% | 0.55 |
| `temperature_derating` | Temperature > 30°C AND residual < −10% | 0.75 |
| `degradation` | Residual < −20% | 0.50 |
| `irradiance_sensor_fault` | Residual > 40% (overproduction) | 0.62 |

---

## Reading Attribution Results as a Power Engineer

Attribution confidence is a function of signal freshness, residual magnitude, and condition match — not a probability that the hypothesis is true.

| Confidence | Meaning |
|------------|---------|
| > 0.75 | Strong physical match — conditions are highly consistent with this cause |
| 0.50–0.75 | Plausible — conditions are partially consistent; warrants investigation |
| 0.40–0.50 | Weak match — included for completeness; other causes may be more likely |
| < 0.40 | Filtered out by default |

Multiple hypotheses can be above threshold simultaneously. This is by design: the system reflects physical uncertainty rather than forcing a single answer.

---

## Attribution in the Audit Trace

Every attribution step is recorded in the analysis pipeline audit trace:

```json
{
  "step": "causal_attribution",
  "inputs": {
    "residual_pct": -34.2,
    "wind_speed_mps": 9.1,
    "temperature_c": 18.5,
    "signal_confidence": 0.87
  },
  "output": [
    { "cause": "wake_effect", "confidence": 0.63 },
    { "cause": "blade_degradation", "confidence": 0.57 }
  ],
  "method": "evidence_confidence_ranking: residual -34.2% at wind 9.1 m/s; wake_effect c_base=0.72, blade_degradation c_base=0.65; both scaled by signal confidence 0.87"
}
```

This makes every attribution result inspectable and reproducible.

---

## Implementation

See: `packages/predictive/src/dispatchlayer_predictive/causal_attribution.py`
