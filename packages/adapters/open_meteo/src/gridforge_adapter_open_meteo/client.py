from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone

import httpx

from gridforge_domain.models import GeoPoint, ForecastWindow, WeatherForecast, WeatherSample
from gridforge_domain.errors import ProviderRateLimitError, ProviderUnavailableError, ProviderSchemaError
from .config import OpenMeteoConfig

logger = logging.getLogger(__name__)

_DEFAULT_VARIABLES = [
    "temperature_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "cloud_cover",
    "shortwave_radiation",
    "direct_radiation",
    "diffuse_radiation",
]


class OpenMeteoClient:
    def __init__(self, config: OpenMeteoConfig | None = None):
        self._config = config or OpenMeteoConfig()

    async def get_forecast(
        self,
        location: GeoPoint,
        window: ForecastWindow,
        variables: list[str] | None = None,
    ) -> WeatherForecast:
        vars_to_fetch = variables or _DEFAULT_VARIABLES
        start_str = window.start_utc.strftime("%Y-%m-%d")
        end_str = window.end_utc.strftime("%Y-%m-%d")

        params = {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "hourly": ",".join(vars_to_fetch),
            "start_date": start_str,
            "end_date": end_str,
            "timezone": "UTC",
            "wind_speed_unit": "ms",
        }

        for attempt in range(self._config.retries):
            try:
                async with httpx.AsyncClient(timeout=self._config.timeout_seconds) as client:
                    response = await client.get(self._config.base_url, params=params)
                    if response.status_code == 429:
                        wait = 2 ** attempt
                        logger.warning("Open-Meteo rate limited, waiting %ds", wait)
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderRateLimitError("open_meteo", "Rate limit exceeded")
                        continue
                    if response.status_code >= 500:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderUnavailableError("open_meteo", f"HTTP {response.status_code}")
                        continue
                    response.raise_for_status()
                    data = response.json()
                    return self._map_response(data, location, window)
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                wait = 2 ** attempt
                logger.warning("Open-Meteo connection error (attempt %d): %s", attempt + 1, exc)
                await asyncio.sleep(wait)
                if attempt == self._config.retries - 1:
                    raise ProviderUnavailableError("open_meteo", str(exc)) from exc

        raise ProviderUnavailableError("open_meteo", "All retries exhausted")

    def _map_response(
        self, data: dict, location: GeoPoint, window: ForecastWindow
    ) -> WeatherForecast:
        try:
            hourly = data["hourly"]
            times = hourly["time"]
            samples: list[WeatherSample] = []

            for i, t_str in enumerate(times):
                ts = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)

                def _get(key: str) -> float | None:
                    vals = hourly.get(key)
                    if vals and i < len(vals) and vals[i] is not None:
                        return float(vals[i])
                    return None

                samples.append(WeatherSample(
                    timestamp_utc=ts,
                    temperature_c=_get("temperature_2m"),
                    wind_speed_mps=_get("wind_speed_10m"),
                    wind_direction_deg=_get("wind_direction_10m"),
                    cloud_cover_pct=_get("cloud_cover"),
                    shortwave_radiation_wm2=_get("shortwave_radiation"),
                    direct_radiation_wm2=_get("direct_radiation"),
                    diffuse_radiation_wm2=_get("diffuse_radiation"),
                    source="open_meteo",
                ))

            return WeatherForecast(
                location=location,
                window=window,
                samples=tuple(samples),
                source="open_meteo",
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderSchemaError("open_meteo", f"Schema error: {exc}") from exc
