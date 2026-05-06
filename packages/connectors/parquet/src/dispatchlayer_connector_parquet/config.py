"""
S3/Parquet archive replay connector configuration.

Provides read-only access to historical telemetry stored in columnar Parquet
format on S3 or local filesystem.  Used for Proofs, temporal playback, and
long-range validation.  No write path is implemented.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ParquetConfig:
    """Parquet archive source configuration."""

    uri:            str  = "s3://dispatchlayer-archive/telemetry/"
    local_path:     str  = ""     # non-empty overrides URI for local filesystem
    partition_cols: tuple[str, ...] = ("year", "month", "asset_id")
    fixture_mode:   bool = True    # True = return fixture data; False = query archive
    page_size:      int  = 10_000
