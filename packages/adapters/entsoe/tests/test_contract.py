"""Contract test for ENTSO-E adapter using local fixture."""
import pathlib
import asyncio
from datetime import datetime, timezone

from gridforge_domain.models import ForecastWindow
from gridforge_adapter_entsoe.client import EntsoeClient

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "sample_response.xml"


def test_entsoe_contract():
    xml_text = FIXTURE.read_text()
    window = ForecastWindow(
        start_utc=datetime(2024, 1, 15, tzinfo=timezone.utc),
        end_utc=datetime(2024, 1, 16, tzinfo=timezone.utc),
        resolution_minutes=60,
    )
    client = EntsoeClient()
    results = client._parse_xml(xml_text, "10YDE-EON------1")
    assert len(results) == 1
    assert results[0].wind_mw == 5200.0
    assert results[0].solar_mw == 1800.0
    assert results[0].source == "entsoe"


def test_entsoe_no_key_returns_empty():
    from gridforge_adapter_entsoe.config import EntsoeConfig
    config = EntsoeConfig(api_key=None)
    client = EntsoeClient(config=config)
    window = ForecastWindow(
        start_utc=datetime(2024, 1, 15, tzinfo=timezone.utc),
        end_utc=datetime(2024, 1, 16, tzinfo=timezone.utc),
        resolution_minutes=60,
    )
    result = asyncio.run(client.get_generation_mix("10YDE-EON------1", window))
    assert result == []
