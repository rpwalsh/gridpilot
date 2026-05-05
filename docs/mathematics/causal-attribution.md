# Causal Attribution

## Purpose

When a significant residual is detected, causal attribution determines the most likely physical causes and quantifies the confidence of each hypothesis.

## Wind Turbine Attribution

| Hypothesis | Condition | Base Confidence |
|------------|-----------|-----------------|
| `wake_effect` | Wind speed 3–12 m/s AND residual < −30% | 0.72 |
| `blade_degradation` | Residual < −20% AND wind 3–25 m/s | 0.65 |
| `yaw_misalignment` | Residual −10% to −30% AND wind > 5 m/s | 0.58 |
| `icing` | Temperature < 2°C AND residual < −15% | 0.81 |
| `curtailment` | Residual < −50% | 0.70 |
| `sensor_fault` | Residual > 30% | 0.60 |

### Confidence Adjustment

Each hypothesis confidence is scaled by the input signal confidence:

```
c_hypothesis = c_base × c_signal
```

### Output

Hypotheses are returned sorted by confidence descending. The calling code may filter to those above a threshold (default: 0.4).

## Solar Inverter Attribution

| Hypothesis | Condition | Base Confidence |
|------------|-----------|-----------------|
| `soiling` | Residual < −15% | 0.68 |
| `shading` | Residual < −25% | 0.60 |
| `inverter_clipping` | Temperature > 35°C AND residual > 10% | 0.55 |
| `temperature_derating` | Temperature > 30°C AND residual < −10% | 0.75 |
| `degradation` | Residual < −20% | 0.50 |
| `irradiance_sensor_fault` | Residual > 40% | 0.62 |
