from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone

import httpx

from dispatchlayer_domain.models import GeoPoint, ForecastWindow, WeatherForecast, WeatherSample
from dispatchlayer_domain.errors import ProviderRateLimitError, ProviderUnavailableError, ProviderSchemaError
from .config import NoaaNwsConfig

logger = logging.getLogger(__name__)

_MPH_TO_MPS = 1.0 / 2.237


class NoaaNwsClient:
    def __init__(self, config: NoaaNwsConfig | None = None):
        self._config = config or NoaaNwsConfig()

    def _headers(self) -> dict:
        return {"User-Agent": self._config.user_agent, "Accept": "application/geo+json"}

    async def _get_json(self, client: httpx.AsyncClient, url: str, attempt: int = 0) -> dict:
        response = await client.get(url, headers=self._headers())
        if response.status_code == 429:
            wait = 2 ** attempt
            await asyncio.sleep(wait)
            raise ProviderRateLimitError("noaa_nws", "Rate limit exceeded")
        if response.status_code >= 500:
            raise ProviderUnavailableError("noaa_nws", f"HTTP {response.status_code}")
        response.raise_for_status()
        return response.json()

    async def get_forecast(
        self,
        location: GeoPoint,
        window: ForecastWindow,
        variables: list[str] | None = None,
    ) -> WeatherForecast:
        points_url = f"{self._config.base_url}/points/{location.latitude:.4f},{location.longitude:.4f}"

        for attempt in range(self._config.retries):
            try:
                async with httpx.AsyncClient(timeout=self._config.timeout_seconds) as client:
                    points_data = await self._get_json(client, points_url, attempt)
                    forecast_url = points_data["properties"]["forecastHourly"]
                    forecast_data = await self._get_json(client, forecast_url, attempt)
                    return self._map_response(forecast_data, location, window)
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                wait = 2 ** attempt
                logger.warning("NOAA NWS connection error (attempt %d): %s", attempt + 1, exc)
                await asyncio.sleep(wait)
                if attempt == self._config.retries - 1:
                    raise ProviderUnavailableError("noaa_nws", str(exc)) from exc
            except (ProviderRateLimitError, ProviderUnavailableError):
                if attempt == self._config.retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)

        raise ProviderUnavailableError("noaa_nws", "All retries exhausted")

    def _map_response(
        self, data: dict, location: GeoPoint, window: ForecastWindow
    ) -> WeatherForecast:
        try:
            periods = data["properties"]["periods"]
            samples: list[WeatherSample] = []

            for period in periods:
                start_str = period["startTime"]
                ts = datetime.fromisoformat(start_str).astimezone(timezone.utc)

                if ts < window.start_utc.replace(tzinfo=timezone.utc) or ts > window.end_utc.replace(tzinfo=timezone.utc):
                    continue

                wind_str = period.get("windSpeed", "0 mph")
                try:
                    wind_mph = float(wind_str.split()[0])
                except (ValueError, IndexError):
                    wind_mph = 0.0
                wind_mps = wind_mph * _MPH_TO_MPS

                temp_f = period.get("temperature")
                temp_c: float | None = None
                if temp_f is not None:
                    unit = period.get("temperatureUnit", "F")
                    if unit == "F":
                        temp_c = (float(temp_f) - 32.0) * 5.0 / 9.0
                    else:
                        temp_c = float(temp_f)

                samples.append(WeatherSample(
                    timestamp_utc=ts,
                    temperature_c=temp_c,
                    wind_speed_mps=wind_mps,
                    wind_direction_deg=None,
                    cloud_cover_pct=None,
                    shortwave_radiation_wm2=None,
                    direct_radiation_wm2=None,
                    diffuse_radiation_wm2=None,
                    source="noaa_nws",
                ))

            return WeatherForecast(
                location=location,
                window=window,
                samples=tuple(samples),
                source="noaa_nws",
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderSchemaError("noaa_nws", f"Schema error: {exc}") from exc
