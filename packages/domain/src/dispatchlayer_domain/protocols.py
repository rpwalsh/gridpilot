# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
from typing import Protocol, runtime_checkable
from .models import GeoPoint, ForecastWindow, WeatherForecast, SolarResource, GridDemand, MarketSignal


@runtime_checkable
class WeatherForecastProvider(Protocol):
    async def get_forecast(
        self,
        location: GeoPoint,
        window: ForecastWindow,
        variables: list[str] | None = None,
    ) -> WeatherForecast: ...


@runtime_checkable
class SolarResourceProvider(Protocol):
    async def get_solar_resource(
        self,
        location: GeoPoint,
        window: ForecastWindow,
    ) -> SolarResource: ...


@runtime_checkable
class GridDemandProvider(Protocol):
    async def get_grid_demand(
        self,
        balancing_authority: str,
        window: ForecastWindow,
    ) -> GridDemand: ...


@runtime_checkable
class MarketSignalProvider(Protocol):
    async def get_market_signals(
        self,
        region: str,
        window: ForecastWindow,
    ) -> list[MarketSignal]: ...
