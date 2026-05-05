"""Contract test for EIA adapter using local fixture."""
import json
import pathlib
import asyncio
from datetime import datetime, timezone

from gridforge_domain.models import ForecastWindow
from gridforge_adapter_eia.client import EiaClient

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "sample_response.json"


def test_eia_contract():
    data = json.loads(FIXTURE.read_text())
    window = ForecastWindow(
        start_utc=datetime(2024, 1, 15, tzinfo=timezone.utc),
        end_utc=datetime(2024, 1, 16, tzinfo=timezone.utc),
        resolution_minutes=60,
    )
    client = EiaClient()
    result = client._map_response(data, "MISO", window)
    assert result.source == "eia"
    assert len(result.samples) == 2
    assert result.samples[0].demand_mw == 85200.0


def test_eia_no_key_returns_empty():
    from gridforge_adapter_eia.config import EiaConfig
    config = EiaConfig(api_key=None)
    client = EiaClient(config=config)
    window = ForecastWindow(
        start_utc=datetime(2024, 1, 15, tzinfo=timezone.utc),
        end_utc=datetime(2024, 1, 16, tzinfo=timezone.utc),
        resolution_minutes=60,
    )
    result = asyncio.run(client.get_grid_demand("MISO", window))
    assert result.source == "eia"
    assert len(result.samples) == 0
