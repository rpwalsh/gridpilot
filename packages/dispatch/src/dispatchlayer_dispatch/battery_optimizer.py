from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from dispatchlayer_predictive.decision_trace import AuditTrace


class StorageState(str, Enum):
    CHARGE = "charge"
    DISCHARGE = "discharge"
    HOLD = "hold"


# Backward-compatible alias
DispatchAction = StorageState


@dataclass
class DispatchResult:
    battery_id: str
    storage_state: StorageState
    window_hours: int
    estimated_value_usd: float
    net_value_usd: float
    current_soc_pct: float
    target_soc_pct: float
    audit_trace: AuditTrace


_MIN_SOC_PCT = 10.0
_MAX_SOC_PCT = 90.0
_HIGH_PRICE_THRESHOLD = 80.0
_LOW_PRICE_THRESHOLD = 30.0
_DISCHARGE_EFFICIENCY = 0.92
_CHARGE_EFFICIENCY = 0.93


def optimize_dispatch(
    battery_id: str,
    current_soc_pct: float,
    capacity_kwh: float,
    forecast_solar_kw: float = 0.0,
    forecast_demand_kw: float = 0.0,
    price_per_mwh: float = 50.0,
    window_hours: int = 4,
) -> DispatchResult:
    """Compute battery storage state based on SoC, price signals, and generation forecast."""
    trace = AuditTrace(model_versions={"dispatch": "0.1.0", "predictive_core": "0.1.0"})

    usable_kwh = capacity_kwh * (current_soc_pct - _MIN_SOC_PCT) / 100.0
    headroom_kwh = capacity_kwh * (_MAX_SOC_PCT - current_soc_pct) / 100.0

    trace.add_step(
        "assess_soc",
        inputs={"current_soc_pct": current_soc_pct, "capacity_kwh": capacity_kwh},
        output={"usable_kwh": usable_kwh, "headroom_kwh": headroom_kwh},
        method=f"soc_{current_soc_pct:.1f}pct",
    )

    net_generation_kw = forecast_solar_kw - forecast_demand_kw
    surplus_kwh = net_generation_kw * window_hours

    trace.add_step(
        "assess_generation",
        inputs={"forecast_solar_kw": forecast_solar_kw, "forecast_demand_kw": forecast_demand_kw},
        output={"net_generation_kw": net_generation_kw, "surplus_kwh": surplus_kwh},
        method=f"net_gen_{net_generation_kw:.1f}kw",
    )

    storage_state = StorageState.HOLD
    target_soc_pct = current_soc_pct
    estimated_value_usd = 0.0

    if price_per_mwh >= _HIGH_PRICE_THRESHOLD and usable_kwh > 0 and current_soc_pct > _MIN_SOC_PCT + 5:
        storage_state = StorageState.DISCHARGE
        discharge_kwh = min(usable_kwh, capacity_kwh * 0.3)
        target_soc_pct = current_soc_pct - (discharge_kwh / capacity_kwh * 100.0)
        revenue = discharge_kwh * _DISCHARGE_EFFICIENCY * price_per_mwh / 1000.0
        estimated_value_usd = revenue

    elif price_per_mwh <= _LOW_PRICE_THRESHOLD and headroom_kwh > 0 and surplus_kwh > 0:
        storage_state = StorageState.CHARGE
        charge_kwh = min(headroom_kwh, surplus_kwh * _CHARGE_EFFICIENCY)
        target_soc_pct = current_soc_pct + (charge_kwh / capacity_kwh * 100.0)
        future_value = charge_kwh * (_HIGH_PRICE_THRESHOLD - price_per_mwh) / 1000.0
        estimated_value_usd = future_value

    elif surplus_kwh > 0 and headroom_kwh > 0 and current_soc_pct < 70.0:
        storage_state = StorageState.CHARGE
        charge_kwh = min(headroom_kwh, surplus_kwh * _CHARGE_EFFICIENCY, capacity_kwh * 0.2)
        target_soc_pct = current_soc_pct + (charge_kwh / capacity_kwh * 100.0)
        estimated_value_usd = charge_kwh * price_per_mwh / 1000.0 * 0.5

    target_soc_pct = max(_MIN_SOC_PCT, min(_MAX_SOC_PCT, target_soc_pct))

    cycle_cost = capacity_kwh * abs(target_soc_pct - current_soc_pct) / 100.0 * 0.005
    net_value_usd = estimated_value_usd - cycle_cost

    trace.add_step(
        "storage_state_decision",
        inputs={"price_per_mwh": price_per_mwh, "surplus_kwh": surplus_kwh, "current_soc_pct": current_soc_pct},
        output={"storage_state": storage_state.value, "target_soc_pct": target_soc_pct, "net_value_usd": net_value_usd},
        method=f"price_{price_per_mwh:.0f}_soc_{current_soc_pct:.0f}",
    )

    return DispatchResult(
        battery_id=battery_id,
        storage_state=storage_state,
        window_hours=window_hours,
        estimated_value_usd=estimated_value_usd,
        net_value_usd=net_value_usd,
        current_soc_pct=current_soc_pct,
        target_soc_pct=target_soc_pct,
        audit_trace=trace,
    )
