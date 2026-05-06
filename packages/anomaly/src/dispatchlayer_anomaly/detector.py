from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import uuid

from dispatchlayer_domain.models import AssetTelemetry, WeatherSample, AssetType
from dispatchlayer_forecasting.wind_power_curve import wind_power_output_kw
from dispatchlayer_forecasting.solar_irradiance_model import solar_output_kw
from dispatchlayer_predictive.residuals import compute_residual
from dispatchlayer_predictive.causal_attribution import (
    attribute_wind_turbine_underproduction,
    attribute_solar_underproduction,
    CausalHypothesis,
)
from dispatchlayer_predictive.signal_state import Signal, SignalState
from dispatchlayer_predictive.decision_trace import DecisionTrace
from .conditions import AnomalyCondition
from datetime import timezone


@dataclass
class DeviationEvent:
    """A threshold crossing or deviation detected in asset telemetry."""

    event_id: str
    asset_id: str
    site_id: str
    condition: AnomalyCondition
    residual_pct: float
    expected_output_kw: float
    actual_output_kw: float
    confidence: float
    hypotheses: list[CausalHypothesis]
    decision_trace: DecisionTrace


# Backward-compat alias — prefer DeviationEvent in new code


def detect_anomaly(
    telemetry: AssetTelemetry,
    weather: WeatherSample,
    threshold_pct: float = 10.0,
) -> Optional[DeviationEvent]:
    """Detect deviation in asset telemetry against physics-model expectation."""
    trace = DecisionTrace(model_versions={"anomaly": "0.1.0", "predictive_core": "0.1.0"})
    now_utc = telemetry.timestamp_utc

    if telemetry.output_kw is None:
        return None

    actual = telemetry.output_kw

    if telemetry.asset_type == AssetType.WIND_TURBINE:
        wind_speed = weather.wind_speed_mps or 0.0
        expected = wind_power_output_kw(wind_speed, telemetry.capacity_kw)
        trace.add_step(
            "compute_expected_wind",
            inputs={"wind_speed_mps": wind_speed, "capacity_kw": telemetry.capacity_kw},
            output=expected,
            reasoning="Applied polynomial wind power curve to derive expected output",
        )
    elif telemetry.asset_type == AssetType.SOLAR_INVERTER:
        ghi = weather.shortwave_radiation_wm2 or 0.0
        temp = weather.temperature_c or 20.0
        expected = solar_output_kw(ghi, temp, telemetry.capacity_kw)
        trace.add_step(
            "compute_expected_solar",
            inputs={"ghi_wm2": ghi, "temperature_c": temp, "capacity_kw": telemetry.capacity_kw},
            output=expected,
            reasoning="Applied PVWatts-style irradiance model to derive expected output",
        )
    else:
        return None

    if expected < 1.0:
        return None

    residual = compute_residual(expected, actual, telemetry.capacity_kw, threshold_pct)
    trace.add_step(
        "compute_residual",
        inputs={"expected": expected, "actual": actual},
        output={"percent_delta": residual.percent_delta, "direction": residual.direction},
        reasoning=f"Residual {residual.percent_delta:.1f}% {'exceeds' if residual.is_significant else 'within'} threshold {threshold_pct}%",
    )

    if not residual.is_significant:
        return None

    ts = telemetry.timestamp_utc
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    signals: dict[str, Signal] = {
        "wind_speed_mps": Signal("wind_speed_mps", weather.wind_speed_mps, "m/s", "weather", ts),
        "temperature_c": Signal("temperature_c", weather.temperature_c, "C", "weather", ts),
        "output_kw": Signal("output_kw", actual, "kW", "telemetry", ts),
        "curtailment_flag": Signal("curtailment_flag", telemetry.curtailment_flag, None, "telemetry", ts),
        "ghi_wm2": Signal("ghi_wm2", weather.shortwave_radiation_wm2, "W/m2", "weather", ts),
    }
    state = SignalState(signals=signals).normalize()

    if telemetry.asset_type == AssetType.WIND_TURBINE:
        hypotheses = attribute_wind_turbine_underproduction(state, residual.percent_delta)
    else:
        hypotheses = attribute_solar_underproduction(state, residual.percent_delta)

    trace.add_step(
        "causal_attribution",
        inputs={"residual_pct": residual.percent_delta, "asset_type": telemetry.asset_type.value},
        output=[h.cause for h in hypotheses],
        reasoning=f"Ranked {len(hypotheses)} causal hypotheses by evidence confidence",
    )

    if residual.direction == "under":
        condition = AnomalyCondition.UNDERPRODUCTION
    else:
        condition = AnomalyCondition.OVERPRODUCTION

    if telemetry.curtailment_flag:
        condition = AnomalyCondition.CURTAILMENT

    confidence = hypotheses[0].confidence if hypotheses else 0.5

    return DeviationEvent(
        event_id=f"dev_{uuid.uuid4().hex[:10]}",
        asset_id=telemetry.asset_id,
        site_id=telemetry.site_id,
        condition=condition,
        residual_pct=residual.percent_delta,
        expected_output_kw=expected,
        actual_output_kw=actual,
        confidence=confidence,
        hypotheses=hypotheses,
        decision_trace=trace,
    )
