from __future__ import annotations

_CUT_IN_MPS = 3.0
_RATED_MPS = 12.0
_CUT_OUT_MPS = 25.0


def wind_power_output_kw(wind_speed_mps: float, rated_capacity_kw: float) -> float:
    """Compute expected wind turbine output using a polynomial power curve.

    Cut-in: 3 m/s, Rated: 12 m/s, Cut-out: 25 m/s
    """
    if wind_speed_mps < _CUT_IN_MPS or wind_speed_mps >= _CUT_OUT_MPS:
        return 0.0
    if wind_speed_mps >= _RATED_MPS:
        return rated_capacity_kw
    normalized = (wind_speed_mps - _CUT_IN_MPS) / (_RATED_MPS - _CUT_IN_MPS)
    return rated_capacity_kw * (normalized ** 3)


def capacity_factor(wind_speed_mps: float) -> float:
    """Return capacity factor [0, 1] for a given wind speed."""
    if wind_speed_mps < _CUT_IN_MPS or wind_speed_mps >= _CUT_OUT_MPS:
        return 0.0
    if wind_speed_mps >= _RATED_MPS:
        return 1.0
    normalized = (wind_speed_mps - _CUT_IN_MPS) / (_RATED_MPS - _CUT_IN_MPS)
    return normalized ** 3
