from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone

import httpx

from dispatchlayer_domain.models import GeoPoint, ForecastWindow, SolarResource, SolarResourceSample
from dispatchlayer_domain.errors import ProviderAuthError, ProviderRateLimitError, ProviderUnavailableError, ProviderSchemaError
from .config import NrelConfig

logger = logging.getLogger(__name__)


class NrelClient:
    def __init__(self, config: NrelConfig | None = None):
        self._config = config or NrelConfig()

    def _empty_resource(self, location: GeoPoint, window: ForecastWindow) -> SolarResource:
        return SolarResource(location=location, window=window, samples=(), source="nrel")

    async def get_solar_resource(
        self,
        location: GeoPoint,
        window: ForecastWindow,
    ) -> SolarResource:
        if not self._config.api_key:
            logger.warning("NREL_API_KEY not configured; returning empty SolarResource")
            return self._empty_resource(location, window)

        params = {
            "api_key": self._config.api_key,
            "lat": location.latitude,
            "lon": location.longitude,
            "system_capacity": 1,
            "azimuth": 180,
            "tilt": 20,
            "array_type": 1,
            "module_type": 0,
            "losses": 14,
            "timeframe": "hourly",
        }

        for attempt in range(self._config.retries):
            try:
                async with httpx.AsyncClient(timeout=self._config.timeout_seconds) as client:
                    response = await client.get(self._config.base_url, params=params)
                    if response.status_code == 401 or response.status_code == 403:
                        raise ProviderAuthError("nrel", f"Authentication failed: HTTP {response.status_code}")
                    if response.status_code == 429:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderRateLimitError("nrel", "Rate limit exceeded")
                        continue
                    if response.status_code >= 500:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderUnavailableError("nrel", f"HTTP {response.status_code}")
                        continue
                    response.raise_for_status()
                    data = response.json()
                    return self._map_response(data, location, window)
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                wait = 2 ** attempt
                logger.warning("NREL connection error (attempt %d): %s", attempt + 1, exc)
                await asyncio.sleep(wait)
                if attempt == self._config.retries - 1:
                    raise ProviderUnavailableError("nrel", str(exc)) from exc

        raise ProviderUnavailableError("nrel", "All retries exhausted")

    def _map_response(
        self, data: dict, location: GeoPoint, window: ForecastWindow
    ) -> SolarResource:
        try:
            outputs = data.get("outputs", {})
            ac_monthly = outputs.get("ac_monthly", [])
            solrad_monthly = outputs.get("solrad_monthly", [])

            samples: list[SolarResourceSample] = []
            start_month = window.start_utc.month
            for i, (ac, ghi) in enumerate(zip(ac_monthly, solrad_monthly)):
                month = (start_month + i - 1) % 12 + 1
                ts = window.start_utc.replace(month=month, day=1, hour=0, tzinfo=timezone.utc)
                samples.append(SolarResourceSample(
                    timestamp_utc=ts,
                    ghi_wm2=float(ghi) * 1000.0 / 730.0 if ghi is not None else None,
                    dni_wm2=None,
                    dhi_wm2=None,
                    temperature_c=None,
                    source="nrel",
                ))

            return SolarResource(
                location=location,
                window=window,
                samples=tuple(samples),
                source="nrel",
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderSchemaError("nrel", f"Schema error: {exc}") from exc
