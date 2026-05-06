# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Contract test for OpenTelemetry connector using local fixture."""
from dispatchlayer_connector_otel.client import OtelConnectorClient
from dispatchlayer_connector_otel.config import OtelConfig, CollectorState
from dispatchlayer_domain.telemetry import TelemetrySample, Quality


def test_otel_collector_status_fixture():
    client = OtelConnectorClient(OtelConfig(fixture_mode=True))
    status = client.get_collector_status()
    assert status.state == CollectorState.RUNNING
    assert status.spans_dropped == 0
    assert status.export_queue_depth == 0
    assert len(status.metrics) >= 5


def test_otel_platform_samples():
    client = OtelConnectorClient(OtelConfig(fixture_mode=True))
    samples = client.get_platform_samples()
    assert len(samples) >= 5
    for s in samples:
        assert isinstance(s, TelemetrySample)
        assert s.source_id == "otel_collector"
        assert s.quality == Quality.GOOD
        assert s.value is not None
        assert s.audit_hash != ""


def test_otel_no_live_connection():
    client = OtelConnectorClient(OtelConfig(fixture_mode=False))
    try:
        client.get_collector_status()
        assert False, "Expected NotImplementedError"
    except NotImplementedError:
        pass
