# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations

_TEMP_COEFFICIENT = -0.004
_REFERENCE_TEMP_C = 25.0
_STANDARD_GHI_WM2 = 1000.0
_SYSTEM_LOSSES = 0.14
_DC_AC_RATIO = 1.2


def solar_output_kw(
    ghi_wm2: float,
    temperature_c: float,
    array_capacity_kw: float,
    system_losses: float = _SYSTEM_LOSSES,
    dc_ac_ratio: float = _DC_AC_RATIO,
) -> float:
    """Compute expected solar array AC output using a simplified PVWatts-style model."""
    if ghi_wm2 <= 0.0:
        return 0.0

    irradiance_fraction = ghi_wm2 / _STANDARD_GHI_WM2
    cell_temp_c = temperature_c + 30.0 * irradiance_fraction
    temp_derate = 1.0 + _TEMP_COEFFICIENT * (cell_temp_c - _REFERENCE_TEMP_C)
    temp_derate = max(0.5, temp_derate)

    dc_output_kw = array_capacity_kw * irradiance_fraction * temp_derate
    ac_output_kw = dc_output_kw * (1.0 - system_losses) / dc_ac_ratio
    return max(0.0, ac_output_kw)


def performance_ratio(ghi_wm2: float, temperature_c: float) -> float:
    """Compute system performance ratio at given conditions."""
    if ghi_wm2 <= 0.0:
        return 0.0
    irradiance_fraction = ghi_wm2 / _STANDARD_GHI_WM2
    cell_temp_c = temperature_c + 30.0 * irradiance_fraction
    temp_derate = 1.0 + _TEMP_COEFFICIENT * (cell_temp_c - _REFERENCE_TEMP_C)
    return max(0.5, temp_derate) * (1.0 - _SYSTEM_LOSSES)
