from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
from .evidence_graph import EvidenceGraph
from .signal_state import SignalState


@dataclass
class CausalHypothesis:
    cause: str
    confidence: float
    evidence: list[str]


def attribute_wind_turbine_underproduction(
    state: SignalState,
    residual_pct: float,
) -> list[CausalHypothesis]:
    hypotheses: list[CausalHypothesis] = []

    wind = state.get("wind_speed_mps")
    temp = state.get("temperature_c")
    curtailment = state.get("curtailment_flag")

    wind_speed = float(wind.value) if wind and wind.value is not None else None
    temperature = float(temp.value) if temp and temp.value is not None else None
    is_curtailed = bool(curtailment.value) if curtailment else False

    if wind_speed is not None and 6.0 <= wind_speed <= 18.0 and residual_pct < -15.0 and not is_curtailed:
        g = EvidenceGraph("yaw_misalignment")
        g.add_evidence("wind_speed_mps", 0.7, "Wind in rated zone indicates possible yaw error contributing to underproduction")
        g.add_evidence("output_kw", 0.6, f"Output {residual_pct:.1f}% below expected at rated wind speed")
        hypotheses.append(CausalHypothesis(
            cause="yaw_misalignment",
            confidence=g.aggregate_confidence(),
            evidence=[n.description for n in g.nodes],
        ))

    if wind_speed is not None and 10.0 <= wind_speed <= 14.0 and residual_pct < -20.0:
        g = EvidenceGraph("blade_pitch_drift")
        g.add_evidence("wind_speed_mps", 0.65, "Wind speed in rated zone where pitch efficiency is critical")
        g.add_evidence("output_kw", 0.7, "Sustained underproduction consistent with blade pitch drift")
        hypotheses.append(CausalHypothesis(
            cause="blade_pitch_drift",
            confidence=g.aggregate_confidence(),
            evidence=[n.description for n in g.nodes],
        ))

    if temperature is not None and -5.0 <= temperature <= 2.0:
        g = EvidenceGraph("icing_risk")
        g.add_evidence("temperature_c", 0.8, f"Temperature {temperature:.1f}C is in icing risk range")
        if residual_pct < -10.0:
            g.add_evidence("output_kw", 0.6, "Underproduction consistent with blade icing")
        hypotheses.append(CausalHypothesis(
            cause="icing_risk",
            confidence=g.aggregate_confidence(),
            evidence=[n.description for n in g.nodes],
        ))

    if is_curtailed and abs(residual_pct) > 5.0:
        hypotheses.append(CausalHypothesis(
            cause="curtailment_masking",
            confidence=0.9,
            evidence=["Curtailment flag active; residual may reflect grid constraint, not asset fault"],
        ))

    if abs(residual_pct) > 50.0 and not is_curtailed:
        hypotheses.append(CausalHypothesis(
            cause="sensor_failure",
            confidence=0.75,
            evidence=[f"Residual of {residual_pct:.1f}% exceeds threshold for sensor fault suspicion"],
        ))

    hypotheses.sort(key=lambda h: h.confidence, reverse=True)
    return hypotheses


def attribute_solar_underproduction(
    state: SignalState,
    residual_pct: float,
) -> list[CausalHypothesis]:
    hypotheses: list[CausalHypothesis] = []

    ghi = state.get("ghi_wm2")
    temp = state.get("temperature_c")

    ghi_value = float(ghi.value) if ghi and ghi.value is not None else None
    temperature = float(temp.value) if temp and temp.value is not None else None

    if ghi_value is not None and ghi_value < 200.0 and residual_pct < -20.0:
        hypotheses.append(CausalHypothesis(
            cause="unforecast_cloud_cover",
            confidence=0.8,
            evidence=[f"GHI {ghi_value:.0f} W/m2 is low; cloud cover likely not captured in forecast"],
        ))

    if ghi_value is not None and ghi_value > 400.0 and residual_pct < -15.0:
        g = EvidenceGraph("inverter_degradation")
        g.add_evidence("ghi_wm2", 0.7, f"Good irradiance ({ghi_value:.0f} W/m2) but output below expected")
        g.add_evidence("output_kw", 0.65, f"Output {residual_pct:.1f}% below expected despite good solar resource")
        hypotheses.append(CausalHypothesis(
            cause="inverter_degradation",
            confidence=g.aggregate_confidence(),
            evidence=[n.description for n in g.nodes],
        ))

    if residual_pct < -5.0 and residual_pct > -20.0 and ghi_value is not None and ghi_value > 300.0:
        hypotheses.append(CausalHypothesis(
            cause="panel_soiling",
            confidence=0.55,
            evidence=[f"Moderate underproduction ({residual_pct:.1f}%) with good irradiance consistent with soiling"],
        ))

    if temperature is not None and temperature > 35.0 and residual_pct < -5.0:
        hypotheses.append(CausalHypothesis(
            cause="high_temperature_derating",
            confidence=0.7,
            evidence=[f"Temperature {temperature:.1f}C causes panel efficiency derating"],
        ))

    hypotheses.sort(key=lambda h: h.confidence, reverse=True)
    return hypotheses
