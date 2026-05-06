from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid


@dataclass(frozen=True)
class GeoPoint:
    latitude: float
    longitude: float


@dataclass(frozen=True)
class ForecastWindow:
    start_utc: datetime
    end_utc: datetime
    resolution_minutes: int


@dataclass(frozen=True)
class WeatherSample:
    timestamp_utc: datetime
    temperature_c: Optional[float]
    wind_speed_mps: Optional[float]
    wind_direction_deg: Optional[float]
    cloud_cover_pct: Optional[float]
    shortwave_radiation_wm2: Optional[float]
    direct_radiation_wm2: Optional[float]
    diffuse_radiation_wm2: Optional[float]
    source: str


@dataclass(frozen=True)
class SolarResourceSample:
    timestamp_utc: datetime
    ghi_wm2: Optional[float]
    dni_wm2: Optional[float]
    dhi_wm2: Optional[float]
    temperature_c: Optional[float]
    source: str


@dataclass(frozen=True)
class GridDemandSample:
    timestamp_utc: datetime
    balancing_authority: str
    demand_mw: Optional[float]
    demand_forecast_mw: Optional[float]
    net_generation_mw: Optional[float]
    source: str


@dataclass(frozen=True)
class MarketSignal:
    timestamp_utc: datetime
    region: str
    price_per_mwh: Optional[float]
    source: str


class AssetType(str, Enum):
    WIND_TURBINE = "wind_turbine"
    SOLAR_INVERTER = "solar_inverter"
    BATTERY = "battery"
    METER = "meter"


@dataclass(frozen=True)
class AssetTelemetry:
    timestamp_utc: datetime
    asset_id: str
    site_id: str
    asset_type: AssetType
    output_kw: Optional[float]
    capacity_kw: float
    curtailment_flag: bool = False
    auxiliary_data: dict = field(default_factory=dict)


@dataclass(frozen=True)
class WeatherForecast:
    location: GeoPoint
    window: ForecastWindow
    samples: tuple[WeatherSample, ...]
    source: str


@dataclass(frozen=True)
class SolarResource:
    location: GeoPoint
    window: ForecastWindow
    samples: tuple[SolarResourceSample, ...]
    source: str


@dataclass(frozen=True)
class GridDemand:
    balancing_authority: str
    window: ForecastWindow
    samples: tuple[GridDemandSample, ...]
    source: str


@dataclass(frozen=True)
class GenerationMix:
    timestamp_utc: datetime
    balancing_authority: str
    wind_mw: Optional[float]
    solar_mw: Optional[float]
    natural_gas_mw: Optional[float]
    coal_mw: Optional[float]
    nuclear_mw: Optional[float]
    hydro_mw: Optional[float]
    other_mw: Optional[float]
    source: str


@dataclass(frozen=True)
class PortfolioSummary:
    portfolio_id: str
    window: ForecastWindow
    expected_generation_mwh: float
    p10_generation_mwh: float
    p50_generation_mwh: float
    p90_generation_mwh: float
    primary_constraints: tuple[str, ...]
    forecast_basis: tuple[str, ...]
