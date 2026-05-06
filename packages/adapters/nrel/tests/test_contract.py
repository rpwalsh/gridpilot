"""Contract test for NREL adapter using local fixture."""
import json
import pathlib
from datetime import datetime, timezone

from dispatchlayer_domain.models import GeoPoint, ForecastWindow
from dispatchlayer_adapter_nrel.client import NrelClient

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "sample_response.json"


def test_nrel_contract():
    data = json.loads(FIXTURE.read_text())
    location = GeoPoint(latitude=44.98, longitude=-93.27)
    window = ForecastWindow(
        start_utc=datetime(2024, 1, 1, tzinfo=timezone.utc),
        end_utc=datetime(2024, 12, 31, tzinfo=timezone.utc),
        resolution_minutes=60 * 24 * 30,
    )
    client = NrelClient()
    resource = client._map_response(data, location, window)
    assert resource.source == "nrel"
    assert len(resource.samples) == 12


def test_nrel_no_key_returns_empty():
    import asyncio
    from dispatchlayer_adapter_nrel.config import NrelConfig
    config = NrelConfig(api_key=None)
    client = NrelClient(config=config)
    location = GeoPoint(latitude=44.98, longitude=-93.27)
    window = ForecastWindow(
        start_utc=datetime(2024, 1, 1, tzinfo=timezone.utc),
        end_utc=datetime(2024, 1, 2, tzinfo=timezone.utc),
        resolution_minutes=60,
    )
    result = asyncio.run(client.get_solar_resource(location, window))
    assert result.source == "nrel"
    assert len(result.samples) == 0
