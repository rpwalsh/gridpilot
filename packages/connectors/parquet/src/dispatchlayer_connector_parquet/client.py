"""
S3/Parquet archive replay connector client.

Provides read-only access to historical telemetry stored as Parquet files on
S3 or local filesystem.  Used for Proofs page, temporal playback, and long-range
holdout validation.

In fixture_mode (default), returns deterministic series from an embedded fixture.
In live mode, requires pyarrow + s3fs and configured AWS credentials.
"""
from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from dispatchlayer_domain.telemetry import TelemetrySample, Quality

from .config import ParquetConfig

FIXTURE_PATH = pathlib.Path(__file__).parent.parent.parent / "tests" / "fixtures" / "archive_series.json"


@dataclass
class ArchiveSample:
    """A single row from the Parquet archive."""

    asset_id:      str
    channel:       str
    timestamp_utc: datetime
    value:         float | None
    unit:          Optional[str]
    quality:       str    # "GOOD" | "BAD" | "MISSING"
    partition:     str    # e.g. "2024/01/asset_01"


class ParquetConnectorClient:
    """Read-only S3/Parquet archive client."""

    def __init__(self, config: ParquetConfig | None = None) -> None:
        self._config = config or ParquetConfig()

    def query_series(
        self,
        asset_id: str,
        channel: str,
        start: datetime,
        end: datetime,
    ) -> list[ArchiveSample]:
        """Query a time-series range from the archive."""
        if self._config.fixture_mode:
            return self._load_fixture(asset_id, channel, start, end)
        raise NotImplementedError(
            "Live Parquet archive requires pyarrow + s3fs — set fixture_mode=True for offline use"
        )

    def get_samples(
        self,
        asset_id: str,
        channel: str,
        start: datetime,
        end: datetime,
    ) -> list[TelemetrySample]:
        """Return archive rows as unified TelemetrySamples."""
        rows = self.query_series(asset_id, channel, start, end)
        now = datetime.now(timezone.utc)
        samples = []
        for row in rows:
            try:
                quality = Quality(row.quality)
            except ValueError:
                quality = Quality.UNCERTAIN
            samples.append(TelemetrySample(
                source_id=self._config.uri or self._config.local_path,
                channel_id=row.channel,
                asset_id=row.asset_id,
                timestamp_utc=row.timestamp_utc,
                value=row.value,
                unit=row.unit,
                quality=quality,
                source_timestamp_utc=row.timestamp_utc,
                ingest_timestamp_utc=now,
                tags={
                    "partition": row.partition,
                    "connector": "parquet",
                },
            ))
        return samples

    def _load_fixture(
        self,
        asset_id: str,
        channel: str,
        start: datetime,
        end: datetime,
    ) -> list[ArchiveSample]:
        data = json.loads(FIXTURE_PATH.read_text())
        rows = []
        for item in data["series"]:
            ts = datetime.fromisoformat(item["timestamp_utc"])
            if not (start <= ts <= end):
                continue
            if item["asset_id"] != asset_id or item["channel"] != channel:
                continue
            rows.append(ArchiveSample(
                asset_id=item["asset_id"],
                channel=item["channel"],
                timestamp_utc=ts,
                value=item.get("value"),
                unit=item.get("unit"),
                quality=item.get("quality", "GOOD"),
                partition=item.get("partition", ""),
            ))
        return rows
