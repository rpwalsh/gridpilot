# Residual Analysis

## Definition

A residual is the signed difference between observed generation and model-expected generation:

```
residual_kw = observed_kw − expected_kw
residual_pct = 100 × (observed_kw − expected_kw) / expected_kw
```

## Significance Threshold

A residual is considered significant when:

```
|residual_pct| > threshold_pct   (default: 15%)
```

## Wind Turbine Expected Output

Expected output is computed from the wind power curve model:

- **Below cut-in** (< 3 m/s): 0 kW
- **Cut-in to rated** (3–12 m/s): cubic polynomial `P = capacity × (v − v_cut_in)³ / (v_rated − v_cut_in)³`
- **Rated to cut-out** (12–25 m/s): `capacity_kw`
- **Above cut-out** (> 25 m/s): 0 kW (protection shutdown)

## Solar Inverter Expected Output

Based on a PVWatts-style irradiance model:

```
dc_output = ghi_wm2 × derating_factor × (1 + temp_coefficient × (temperature_c − 25))
ac_output = dc_output / dc_ac_ratio × system_efficiency
```

Where:
- `temp_coefficient = −0.004 /°C`
- `system_efficiency = 0.86` (accounts for 14% losses)
- `dc_ac_ratio = 1.2`
