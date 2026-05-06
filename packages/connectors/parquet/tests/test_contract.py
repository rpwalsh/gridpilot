# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Contract test for S3/Parquet archive connector using local fixture."""
from datetime import datetime, timezone
from dispatchlayer_connector_parquet.client import ParquetConnectorClient
from dispatchlayer_connector_parquet.config import ParquetConfig
from dispatchlayer_domain.telemetry import TelemetrySample, Quality


START = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)
END   = datetime(2025, 1, 1, 23, 59, tzinfo=timezone.utc)


def test_parquet_query_series_fixture():
    client = ParquetConnectorClient(ParquetConfig(fixture_mode=True))
    rows = client.query_series("SOLAR_PLANT_01", "active_power_kw", START, END)
    assert len(rows) == 5
    noon = next(r for r in rows if r.timestamp_utc.hour == 12)
    assert noon.value == 3180.5
    assert noon.unit == "kW"
    assert noon.quality == "GOOD"


def test_parquet_asset_filter():
    client = ParquetConnectorClient(ParquetConfig(fixture_mode=True))
    rows = client.query_series("WIND_FARM_01", "active_power_kw", START, END)
    assert len(rows) == 3
    missing = [r for r in rows if r.quality == "MISSING"]
    assert len(missing) == 1
    assert missing[0].value is None


def test_parquet_samples_output():
    client = ParquetConnectorClient(ParquetConfig(fixture_mode=True))
    samples = client.get_samples("SOLAR_PLANT_01", "active_power_kw", START, END)
    assert len(samples) == 5
    for s in samples:
        assert isinstance(s, TelemetrySample)
        assert "parquet" in s.tags["connector"]
        assert s.audit_hash != ""


def test_parquet_quality_mapping():
    client = ParquetConnectorClient(ParquetConfig(fixture_mode=True))
    samples = client.get_samples("WIND_FARM_01", "active_power_kw", START, END)
    missing = [s for s in samples if s.quality == Quality.MISSING]
    assert len(missing) == 1


def test_parquet_no_live_connection():
    client = ParquetConnectorClient(ParquetConfig(fixture_mode=False))
    try:
        client.query_series("X", "y", START, END)
        assert False, "Expected NotImplementedError"
    except NotImplementedError:
        pass
