"""
AWS IoT SiteWise read-only connector configuration.

Provides access to industrial asset models, property streams, and time-series
values via the SiteWise API.  Only read operations are implemented
(ListAssets, GetAssetPropertyValueHistory, BatchGetAssetPropertyValue).
No write, command, or control paths are implemented.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SiteWiseConfig:
    """AWS IoT SiteWise connection parameters."""

    region:          str  = "us-east-1"
    endpoint_url:    str  = ""           # empty = use AWS default
    asset_model_id:  str  = ""           # filter by model; empty = all
    fixture_mode:    bool = True          # True = return fixture data; False = call AWS
    max_results:     int  = 250
