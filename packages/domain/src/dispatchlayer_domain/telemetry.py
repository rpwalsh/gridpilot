"""
Canonical telemetry models for hardware asset signals.

TelemetryPoint  – a single timestamped signal/value pair (raw ingestion).
AssetTelemetrySnapshot – normalised per-asset operational summary.

These are the 'operational truth' half of the product: real provider APIs
supply the external-signal side; hardware telemetry supplies what the asset
actually did.  In a deployed system these are ingested from SCADA historians,
edge gateways, MQTT streams, OPC UA servers, or CSV/Parquet exports.  In the
public repo the snapshot is populated from recorded fixtures to keep the demo
honest about what is live vs. recorded.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional, Union

from pydantic import BaseModel, Field


class TelemetryPoint(BaseModel):
    """A single timestamped, typed signal value as received from an asset."""

    timestamp_utc: datetime
    site_id: str
    asset_id: str
    asset_type: Literal[
        "solar_inverter", "wind_turbine", "bess", "meter", "weather_station"
    ]
    signal: str
    value: Union[float, str, bool, None]
    unit: Optional[str] = None
    quality: Literal["good", "suspect", "bad", "missing"] = "good"
    source: str


class AssetTelemetrySnapshot(BaseModel):
    """
    Normalised per-asset operational snapshot.

    Combines generation, health, and asset-type-specific signals into a single
    structure for anomaly detection and recommendation ranking.  Fields are
    Optional so a snapshot can be partially populated (e.g. wind turbine omits
    dc_voltage_v).
    """

    timestamp_utc: datetime
    site_id: str
    asset_id: str
    asset_type: str
    capacity_kw: float

    # ── Generation ─────────────────────────────────────────────────────────────
    power_kw: Optional[float] = None
    expected_power_kw: Optional[float] = None
    availability_pct: Optional[float] = None

    # ── Solar inverter signals ─────────────────────────────────────────────────
    dc_voltage_v: Optional[float] = None
    dc_current_a: Optional[float] = None
    ac_power_kw: Optional[float] = None
    inverter_efficiency_pct: Optional[float] = None
    frequency_hz: Optional[float] = None
    string_current_a: Optional[float] = None

    # ── Wind turbine signals ───────────────────────────────────────────────────
    rotor_rpm: Optional[float] = None
    wind_speed_mps: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    nacelle_direction_deg: Optional[float] = None
    yaw_error_deg: Optional[float] = None
    blade_pitch_deg: Optional[float] = None
    gearbox_temperature_c: Optional[float] = None
    generator_temperature_c: Optional[float] = None
    vibration_mm_s: Optional[float] = None

    # ── BESS signals ───────────────────────────────────────────────────────────
    state_of_charge_pct: Optional[float] = None
    state_of_health_pct: Optional[float] = None
    charge_power_kw: Optional[float] = None
    discharge_power_kw: Optional[float] = None
    cell_temperature_c: Optional[float] = None
    pack_voltage_v: Optional[float] = None
    pack_current_a: Optional[float] = None
    cycle_count: Optional[int] = None
    thermal_derate_flag: Optional[bool] = None
    inverter_status: Optional[str] = None

    # ── Meter / grid coupling signals ──────────────────────────────────────────
    reactive_power_kvar: Optional[float] = None
    voltage_v: Optional[float] = None
    power_factor: Optional[float] = None
    export_limit_kw: Optional[float] = None
    curtailment_signal: Optional[bool] = None

    # ── Common ─────────────────────────────────────────────────────────────────
    temperature_c: Optional[float] = None
    fault_code: Optional[str] = None
    curtailment_flag: Optional[bool] = Field(default=None)
    quality_score: float = Field(default=1.0, ge=0.0, le=1.0)
    data_source: str = "scada"
