# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Contract test for AWS IoT SiteWise connector using local fixture."""
from dispatchlayer_connector_sitewise.client import SiteWiseConnectorClient
from dispatchlayer_connector_sitewise.config import SiteWiseConfig
from dispatchlayer_domain.telemetry import TelemetrySample, Quality


def test_sitewise_get_properties_fixture():
    client = SiteWiseConnectorClient(SiteWiseConfig(fixture_mode=True))
    props = client.get_property_values()
    assert len(props) == 4
    solar = next(p for p in props if "SOLAR" in p.alias)
    assert solar.value == 3421.7
    assert solar.unit == "kW"
    assert solar.quality == "GOOD"


def test_sitewise_uncertain_quality():
    client = SiteWiseConnectorClient(SiteWiseConfig(fixture_mode=True))
    samples = client.get_samples()
    uncertain = [s for s in samples if s.quality == Quality.UNCERTAIN]
    assert len(uncertain) == 1
    assert "345KV" in uncertain[0].channel_id or "SUB" in uncertain[0].channel_id


def test_sitewise_samples_output():
    client = SiteWiseConnectorClient(SiteWiseConfig(fixture_mode=True))
    samples = client.get_samples()
    assert len(samples) == 4
    for s in samples:
        assert isinstance(s, TelemetrySample)
        assert "sitewise" in s.tags["connector"]
        assert s.audit_hash != ""


def test_sitewise_no_live_connection():
    client = SiteWiseConnectorClient(SiteWiseConfig(fixture_mode=False))
    try:
        client.get_property_values()
        assert False, "Expected NotImplementedError"
    except NotImplementedError:
        pass
