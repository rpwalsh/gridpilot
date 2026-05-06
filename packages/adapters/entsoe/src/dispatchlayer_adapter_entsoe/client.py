# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations
import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from xml.etree import ElementTree as ET

import httpx

from dispatchlayer_domain.models import GeoPoint, ForecastWindow, GenerationMix
from dispatchlayer_domain.errors import ProviderAuthError, ProviderRateLimitError, ProviderUnavailableError, ProviderSchemaError
from .config import EntsoeConfig

logger = logging.getLogger(__name__)

_NS = {
    "gl": "urn:iec62325.351:tc57wg16:451-6:generationloaddocument:3:0",
    "ack": "urn:iec62325.351:tc57wg16:451-1:acknowledgementdocument:7:0",
}


class EntsoeClient:
    def __init__(self, config: EntsoeConfig | None = None):
        self._config = config or EntsoeConfig()

    async def get_generation_mix(
        self,
        domain: str,
        window: ForecastWindow,
    ) -> list[GenerationMix]:
        if not self._config.api_key:
            logger.warning("ENTSOE_API_KEY not configured; returning empty GenerationMix list")
            return []

        start_str = window.start_utc.strftime("%Y%m%d%H%M")
        end_str = window.end_utc.strftime("%Y%m%d%H%M")

        params = {
            "securityToken": self._config.api_key,
            "documentType": "A75",
            "processType": "A16",
            "periodStart": start_str,
            "periodEnd": end_str,
            "in_Domain": domain,
        }

        for attempt in range(self._config.retries):
            try:
                async with httpx.AsyncClient(timeout=self._config.timeout_seconds) as client:
                    response = await client.get(self._config.base_url, params=params)
                    if response.status_code in (401, 403):
                        raise ProviderAuthError("entsoe", f"Authentication failed: HTTP {response.status_code}")
                    if response.status_code == 429:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderRateLimitError("entsoe", "Rate limit exceeded")
                        continue
                    if response.status_code >= 500:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        if attempt == self._config.retries - 1:
                            raise ProviderUnavailableError("entsoe", f"HTTP {response.status_code}")
                        continue
                    response.raise_for_status()
                    return self._parse_xml(response.text, domain)
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                wait = 2 ** attempt
                logger.warning("ENTSO-E connection error (attempt %d): %s", attempt + 1, exc)
                await asyncio.sleep(wait)
                if attempt == self._config.retries - 1:
                    raise ProviderUnavailableError("entsoe", str(exc)) from exc

        raise ProviderUnavailableError("entsoe", "All retries exhausted")

    def _parse_xml(self, xml_text: str, domain: str) -> list[GenerationMix]:
        try:
            root = ET.fromstring(xml_text)
            results: list[GenerationMix] = []

            wind_mw: Optional[float] = None
            solar_mw: Optional[float] = None
            ts = datetime.now(timezone.utc)

            for ts_el in root.iter():
                if ts_el.tag.endswith("start"):
                    try:
                        ts = datetime.fromisoformat(ts_el.text.replace("Z", "+00:00"))
                    except (ValueError, AttributeError):
                        pass

            psr_wind_codes = {"B18", "B19"}
            psr_solar_codes = {"B16"}

            for series in root.iter():
                if not series.tag.endswith("TimeSeries"):
                    continue
                psr_type = None
                quantity: Optional[float] = None

                for child in series:
                    tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                    if tag == "MktPSRType":
                        for psr_child in child:
                            psr_tag = psr_child.tag.split("}")[-1] if "}" in psr_child.tag else psr_child.tag
                            if psr_tag == "psrType":
                                psr_type = psr_child.text
                    if tag == "Period":
                        for point in child:
                            pt = point.tag.split("}")[-1] if "}" in point.tag else point.tag
                            if pt == "Point":
                                for q in point:
                                    qt = q.tag.split("}")[-1] if "}" in q.tag else q.tag
                                    if qt == "quantity":
                                        try:
                                            quantity = float(q.text)
                                        except (TypeError, ValueError):
                                            pass

                if psr_type in psr_wind_codes and quantity is not None:
                    wind_mw = (wind_mw or 0.0) + quantity
                elif psr_type in psr_solar_codes and quantity is not None:
                    solar_mw = (solar_mw or 0.0) + quantity

            if wind_mw is not None or solar_mw is not None:
                results.append(GenerationMix(
                    timestamp_utc=ts,
                    balancing_authority=domain,
                    wind_mw=wind_mw,
                    solar_mw=solar_mw,
                    natural_gas_mw=None,
                    coal_mw=None,
                    nuclear_mw=None,
                    hydro_mw=None,
                    other_mw=None,
                    source="entsoe",
                ))

            return results
        except ET.ParseError as exc:
            raise ProviderSchemaError("entsoe", f"XML parse error: {exc}") from exc
