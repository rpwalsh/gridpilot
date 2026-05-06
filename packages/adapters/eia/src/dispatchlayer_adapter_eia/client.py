# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone

import httpx

from dispatchlayer_domain.models import GeoPoint, ForecastWindow, GridDemand, GridDemandSample
from dispatchlayer_domain.errors import ProviderAuthError, ProviderRateLimitError, ProviderUnavailableError, ProviderSchemaError
from .config import EiaConfig

logger = logging.getLogger(__name__)


class EiaClient:
    def __init__(self, config: EiaConfig | None = None):
        self._config = config or EiaConfig()

    def _empty_demand(self, balancing_authority: str, window: ForecastWindow) -> GridDemand:
        return GridDemand(
            balancing_authority=balancing_authority,
            window=window,
            samples=(),
            source="eia",
        )

    async def get_grid_demand(
        self,
        balancing_authority: str,
        window: ForecastWindow,
    ) -> GridDemand:
        if not self._config.api_key:
            logger.warning("EIA_API_KEY not configured; returning empty GridDemand")
            return self._empty_demand(balancing_authority, window)

        start_str = window.start_utc.strftime("%Y-%m-%dT%H")
        end_str = window.end_utc.strftime("%Y-%m-%dT%H")
        url = f"{self._config.base_url}/electricity/rto/region-data/data/"

        params = {
            "api_key": self._config.api_key,
            "frequency": "hourly",
            "data[0]": "value",
            "facets[type][]": "D",
            "facets[respondent][]": balancing_authority,
            "start": start_str,
            "end": end_str,
            "sort[0][column]": "period",
            "sort[0][direction]": "desc",
            "offset": 0,
            "length": 5000,
        }

        for attempt in range(self._config.retries):
            try:
                async with httpx.AsyncClient(timeout=self._config.timeout_seconds) as client:
                    response = await client.get(url, params=params)
                    if response.status_code in (401, 403):
                        raise ProviderAuthError("eia", f"Authentication failed: HTTP {response.status_code}")
                    if response.status_code == 429:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderRateLimitError("eia", "Rate limit exceeded")
                        continue
                    if response.status_code >= 500:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderUnavailableError("eia", f"HTTP {response.status_code}")
                        continue
                    response.raise_for_status()
                    data = response.json()
                    return self._map_response(data, balancing_authority, window)
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                wait = 2 ** attempt
                logger.warning("EIA connection error (attempt %d): %s", attempt + 1, exc)
                await asyncio.sleep(wait)
                if attempt == self._config.retries - 1:
                    raise ProviderUnavailableError("eia", str(exc)) from exc

        raise ProviderUnavailableError("eia", "All retries exhausted")

    def _map_response(
        self, data: dict, balancing_authority: str, window: ForecastWindow
    ) -> GridDemand:
        try:
            rows = data.get("response", {}).get("data", [])
            samples: list[GridDemandSample] = []

            for row in rows:
                period_str = row.get("period", "")
                try:
                    ts = datetime.fromisoformat(period_str).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue

                value = row.get("value")
                demand_mw = float(value) if value is not None else None

                samples.append(GridDemandSample(
                    timestamp_utc=ts,
                    balancing_authority=balancing_authority,
                    demand_mw=demand_mw,
                    demand_forecast_mw=None,
                    net_generation_mw=None,
                    source="eia",
                ))

            samples.sort(key=lambda s: s.timestamp_utc)

            return GridDemand(
                balancing_authority=balancing_authority,
                window=window,
                samples=tuple(samples),
                source="eia",
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderSchemaError("eia", f"Schema error: {exc}") from exc
