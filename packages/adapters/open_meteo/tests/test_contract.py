"""Contract test for Open-Meteo adapter using local fixture."""
import json
import pathlib
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from dispatchlayer_domain.models import GeoPoint, ForecastWindow
from dispatchlayer_adapter_open_meteo.client import OpenMeteoClient


FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "sample_response.json"


@pytest.mark.asyncio
async def test_open_meteo_contract():
    data = json.loads(FIXTURE.read_text())
    location = GeoPoint(latitude=44.98, longitude=-93.27)
    window = ForecastWindow(
        start_utc=datetime(2024, 1, 15, tzinfo=timezone.utc),
        end_utc=datetime(2024, 1, 16, tzinfo=timezone.utc),
        resolution_minutes=60,
    )
    client = OpenMeteoClient()
    forecast = client._map_response(data, location, window)
    assert forecast.source == "open_meteo"
    assert len(forecast.samples) == 3
    assert forecast.samples[0].wind_speed_mps == 7.2
    assert forecast.samples[0].temperature_c == 2.1
