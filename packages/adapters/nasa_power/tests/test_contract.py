# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Contract test for NASA POWER adapter using local fixture."""
import json
import pathlib
from datetime import datetime, timezone

from dispatchlayer_domain.models import GeoPoint, ForecastWindow
from dispatchlayer_adapter_nasa_power.client import NasaPowerClient

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "sample_response.json"


def test_nasa_power_contract():
    data = json.loads(FIXTURE.read_text())
    location = GeoPoint(latitude=44.98, longitude=-93.27)
    window = ForecastWindow(
        start_utc=datetime(2024, 1, 15, tzinfo=timezone.utc),
        end_utc=datetime(2024, 1, 16, tzinfo=timezone.utc),
        resolution_minutes=60,
    )
    client = NasaPowerClient()
    resource = client._map_response(data, location, window)
    assert resource.source == "nasa_power"
    assert len(resource.samples) == 3
    noon_sample = next(s for s in resource.samples if s.timestamp_utc.hour == 12)
    assert noon_sample.ghi_wm2 == 450.3
    assert noon_sample.temperature_c == 12.1
