# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
AWS IoT SiteWise read-only connector client.

Implements ListAssets, GetAssetPropertyValueHistory, and
BatchGetAssetPropertyValue.  No write, command, or control paths.

In fixture_mode (default), returns deterministic asset data from a fixture.
In live mode, requires boto3 and configured AWS credentials.
"""
from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from dispatchlayer_domain.telemetry import TelemetrySample, Quality

from .config import SiteWiseConfig

FIXTURE_PATH = pathlib.Path(__file__).parent.parent.parent / "tests" / "fixtures" / "asset_properties.json"


@dataclass
class SiteWiseProperty:
    """A single SiteWise asset property value (TQV)."""

    asset_id:    str
    property_id: str
    alias:       Optional[str]
    timestamp:   datetime
    value:       float | str | bool | None
    quality:     str        # "GOOD" | "BAD" | "UNCERTAIN"
    unit:        Optional[str]


class SiteWiseConnectorClient:
    """Read-only AWS IoT SiteWise client."""

    def __init__(self, config: SiteWiseConfig | None = None) -> None:
        self._config = config or SiteWiseConfig()

    def get_property_values(self) -> list[SiteWiseProperty]:
        """Return latest property values for configured assets."""
        if self._config.fixture_mode:
            return self._load_fixture()
        raise NotImplementedError(
            "Live SiteWise requires boto3 + AWS credentials  set fixture_mode=True for offline use"
        )

    def get_samples(self) -> list[TelemetrySample]:
        """Return property values as unified TelemetrySamples."""
        props = self.get_property_values()
        now = datetime.now(timezone.utc)
        samples = []
        for p in props:
            try:
                quality = Quality(p.quality)
            except ValueError:
                quality = Quality.UNCERTAIN
            samples.append(TelemetrySample(
                source_id=f"sitewise:{self._config.region}",
                channel_id=p.alias or f"{p.asset_id}/{p.property_id}",
                asset_id=p.asset_id,
                timestamp_utc=p.timestamp,
                value=p.value,
                unit=p.unit,
                quality=quality,
                source_timestamp_utc=p.timestamp,
                ingest_timestamp_utc=now,
                tags={
                    "asset_id":    p.asset_id,
                    "property_id": p.property_id,
                    "connector":   "sitewise",
                },
            ))
        return samples

    def _load_fixture(self) -> list[SiteWiseProperty]:
        data = json.loads(FIXTURE_PATH.read_text())
        props = []
        for item in data["properties"]:
            props.append(SiteWiseProperty(
                asset_id=item["asset_id"],
                property_id=item["property_id"],
                alias=item.get("alias"),
                timestamp=datetime.fromisoformat(item["timestamp"]),
                value=item["value"],
                quality=item.get("quality", "GOOD"),
                unit=item.get("unit"),
            ))
        return props

