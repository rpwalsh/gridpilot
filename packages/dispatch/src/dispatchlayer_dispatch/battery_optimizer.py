# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from dispatchlayer_predictive.decision_trace import DecisionTrace


class DispatchAction(str, Enum):
    CHARGE = "charge"
    DISCHARGE = "discharge"
    HOLD = "hold"


@dataclass
class DispatchResult:
    battery_id: str
    action: DispatchAction
    window_hours: int
    reasoning: list[str]
    estimated_value_usd: float
    net_value_usd: float
    current_soc_pct: float
    target_soc_pct: float
    decision_trace: DecisionTrace


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
    """Optimize battery dispatch action based on SoC, price signals, and generation forecast."""
    trace = DecisionTrace(model_versions={"dispatch": "0.1.0", "predictive_core": "0.1.0"})
    reasoning: list[str] = []

    usable_kwh = capacity_kwh * (current_soc_pct - _MIN_SOC_PCT) / 100.0
    headroom_kwh = capacity_kwh * (_MAX_SOC_PCT - current_soc_pct) / 100.0

    trace.add_step(
        "assess_soc",
        inputs={"current_soc_pct": current_soc_pct, "capacity_kwh": capacity_kwh},
        output={"usable_kwh": usable_kwh, "headroom_kwh": headroom_kwh},
        reasoning=f"SoC {current_soc_pct:.1f}% gives {usable_kwh:.1f} kWh usable and {headroom_kwh:.1f} kWh headroom",
    )

    net_generation_kw = forecast_solar_kw - forecast_demand_kw
    surplus_kwh = net_generation_kw * window_hours

    trace.add_step(
        "assess_generation",
        inputs={"forecast_solar_kw": forecast_solar_kw, "forecast_demand_kw": forecast_demand_kw},
        output={"net_generation_kw": net_generation_kw, "surplus_kwh": surplus_kwh},
        reasoning=f"Net generation {net_generation_kw:.1f} kW over {window_hours}h = {surplus_kwh:.1f} kWh surplus",
    )

    action = DispatchAction.HOLD
    target_soc_pct = current_soc_pct
    estimated_value_usd = 0.0

    if price_per_mwh >= _HIGH_PRICE_THRESHOLD and usable_kwh > 0 and current_soc_pct > _MIN_SOC_PCT + 5:
        action = DispatchAction.DISCHARGE
        discharge_kwh = min(usable_kwh, capacity_kwh * 0.3)
        target_soc_pct = current_soc_pct - (discharge_kwh / capacity_kwh * 100.0)
        revenue = discharge_kwh * _DISCHARGE_EFFICIENCY * price_per_mwh / 1000.0
        estimated_value_usd = revenue
        reasoning.append(f"High market price ${price_per_mwh:.0f}/MWh â€” discharge {discharge_kwh:.0f} kWh for ${revenue:.2f} revenue")
        reasoning.append(f"SoC will move from {current_soc_pct:.1f}% to {target_soc_pct:.1f}%")

    elif price_per_mwh <= _LOW_PRICE_THRESHOLD and headroom_kwh > 0 and surplus_kwh > 0:
        action = DispatchAction.CHARGE
        charge_kwh = min(headroom_kwh, surplus_kwh * _CHARGE_EFFICIENCY)
        target_soc_pct = current_soc_pct + (charge_kwh / capacity_kwh * 100.0)
        future_value = charge_kwh * (_HIGH_PRICE_THRESHOLD - price_per_mwh) / 1000.0
        estimated_value_usd = future_value
        reasoning.append(f"Low market price ${price_per_mwh:.0f}/MWh with surplus solar â€” charge {charge_kwh:.0f} kWh")
        reasoning.append(f"SoC will move from {current_soc_pct:.1f}% to {target_soc_pct:.1f}%")

    elif surplus_kwh > 0 and headroom_kwh > 0 and current_soc_pct < 70.0:
        action = DispatchAction.CHARGE
        charge_kwh = min(headroom_kwh, surplus_kwh * _CHARGE_EFFICIENCY, capacity_kwh * 0.2)
        target_soc_pct = current_soc_pct + (charge_kwh / capacity_kwh * 100.0)
        estimated_value_usd = charge_kwh * price_per_mwh / 1000.0 * 0.5
        reasoning.append(f"Moderate surplus solar {surplus_kwh:.0f} kWh available â€” charge opportunistically")

    else:
        reasoning.append(f"Price ${price_per_mwh:.0f}/MWh is moderate; SoC {current_soc_pct:.1f}% is acceptable â€” hold")
        reasoning.append("No compelling case to charge or discharge in this window")

    target_soc_pct = max(_MIN_SOC_PCT, min(_MAX_SOC_PCT, target_soc_pct))

    cycle_cost = capacity_kwh * abs(target_soc_pct - current_soc_pct) / 100.0 * 0.005
    net_value_usd = estimated_value_usd - cycle_cost

    trace.add_step(
        "dispatch_decision",
        inputs={"price_per_mwh": price_per_mwh, "surplus_kwh": surplus_kwh, "current_soc_pct": current_soc_pct},
        output={"action": action.value, "target_soc_pct": target_soc_pct, "net_value_usd": net_value_usd},
        reasoning=f"Selected {action.value}: {reasoning[0] if reasoning else 'hold'}",
    )

    return DispatchResult(
        battery_id=battery_id,
        action=action,
        window_hours=window_hours,
        reasoning=reasoning,
        estimated_value_usd=estimated_value_usd,
        net_value_usd=net_value_usd,
        current_soc_pct=current_soc_pct,
        target_soc_pct=target_soc_pct,
        decision_trace=trace,
    )
