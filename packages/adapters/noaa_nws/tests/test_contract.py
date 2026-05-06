# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Contract test for NOAA NWS adapter using local fixture."""
import json
import pathlib
import pytest
from datetime import datetime, timezone

from dispatchlayer_domain.models import GeoPoint, ForecastWindow
from dispatchlayer_adapter_noaa_nws.client import NoaaNwsClient

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "sample_response.json"


def test_noaa_nws_contract():
    data = json.loads(FIXTURE.read_text())
    location = GeoPoint(latitude=44.98, longitude=-93.27)
    window = ForecastWindow(
        start_utc=datetime(2024, 1, 15, tzinfo=timezone.utc),
        end_utc=datetime(2024, 1, 16, tzinfo=timezone.utc),
        resolution_minutes=60,
    )
    client = NoaaNwsClient()
    forecast = client._map_response(data, location, window)
    assert forecast.source == "noaa_nws"
    assert len(forecast.samples) == 2
    # 32F = 0C
    assert abs(forecast.samples[0].temperature_c - 0.0) < 0.1
    # 10 mph / 2.237 â‰ˆ 4.47 m/s
    assert abs(forecast.samples[0].wind_speed_mps - 4.47) < 0.1
