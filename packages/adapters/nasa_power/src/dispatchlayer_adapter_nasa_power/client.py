# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone

import httpx

from dispatchlayer_domain.models import GeoPoint, ForecastWindow, SolarResource, SolarResourceSample
from dispatchlayer_domain.errors import ProviderRateLimitError, ProviderUnavailableError, ProviderSchemaError
from .config import NasaPowerConfig

logger = logging.getLogger(__name__)

_PARAMETERS = "ALLSKY_SFC_SW_DWN,T2M,WS10M,WD10M"


class NasaPowerClient:
    def __init__(self, config: NasaPowerConfig | None = None):
        self._config = config or NasaPowerConfig()

    async def get_solar_resource(
        self,
        location: GeoPoint,
        window: ForecastWindow,
    ) -> SolarResource:
        start_str = window.start_utc.strftime("%Y%m%d")
        end_str = window.end_utc.strftime("%Y%m%d")

        params = {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "start": start_str,
            "end": end_str,
            "parameters": _PARAMETERS,
            "community": "RE",
            "format": "JSON",
        }

        for attempt in range(self._config.retries):
            try:
                async with httpx.AsyncClient(timeout=self._config.timeout_seconds) as client:
                    response = await client.get(self._config.base_url, params=params)
                    if response.status_code == 429:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderRateLimitError("nasa_power", "Rate limit exceeded")
                        continue
                    if response.status_code >= 500:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderUnavailableError("nasa_power", f"HTTP {response.status_code}")
                        continue
                    response.raise_for_status()
                    data = response.json()
                    return self._map_response(data, location, window)
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                wait = 2 ** attempt
                logger.warning("NASA POWER connection error (attempt %d): %s", attempt + 1, exc)
                await asyncio.sleep(wait)
                if attempt == self._config.retries - 1:
                    raise ProviderUnavailableError("nasa_power", str(exc)) from exc

        raise ProviderUnavailableError("nasa_power", "All retries exhausted")

    def _map_response(
        self, data: dict, location: GeoPoint, window: ForecastWindow
    ) -> SolarResource:
        try:
            properties = data["properties"]
            parameter_data = properties["parameter"]
            ghi_data = parameter_data.get("ALLSKY_SFC_SW_DWN", {})
            t2m_data = parameter_data.get("T2M", {})
            samples: list[SolarResourceSample] = []

            for time_key, ghi_val in ghi_data.items():
                try:
                    ts = datetime.strptime(time_key, "%Y%m%d%H").replace(tzinfo=timezone.utc)
                except ValueError:
                    continue

                ghi = float(ghi_val) if ghi_val is not None and ghi_val != -999.0 else None
                temp = t2m_data.get(time_key)
                temperature_c = float(temp) if temp is not None and temp != -999.0 else None

                samples.append(SolarResourceSample(
                    timestamp_utc=ts,
                    ghi_wm2=ghi,
                    dni_wm2=None,
                    dhi_wm2=None,
                    temperature_c=temperature_c,
                    source="nasa_power",
                ))

            samples.sort(key=lambda s: s.timestamp_utc)

            return SolarResource(
                location=location,
                window=window,
                samples=tuple(samples),
                source="nasa_power",
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderSchemaError("nasa_power", f"Schema error: {exc}") from exc
