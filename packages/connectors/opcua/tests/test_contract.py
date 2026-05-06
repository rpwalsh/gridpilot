# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Contract test for OPC UA connector using local fixture."""
from dispatchlayer_connector_opcua.client import OpcUaConnectorClient
from dispatchlayer_connector_opcua.config import OpcUaConfig, NodeQuality
from dispatchlayer_domain.telemetry import TelemetrySample, Quality


def test_opcua_read_nodes_fixture():
    client = OpcUaConnectorClient(OpcUaConfig(fixture_mode=True))
    nodes = client.read_nodes()
    assert len(nodes) == 5
    # Active power node
    power = next(n for n in nodes if "ActivePower" in n.browse_name)
    assert power.value == 1843.5
    assert power.unit == "kW"
    assert power.quality == NodeQuality.GOOD


def test_opcua_node_id_filter():
    client = OpcUaConnectorClient(OpcUaConfig(fixture_mode=True))
    nodes = client.read_nodes(["ns=2;s=SCADA.WIND.WTG001.ActivePower"])
    assert len(nodes) == 1
    assert nodes[0].value == 1843.5


def test_opcua_samples_output():
    client = OpcUaConnectorClient(OpcUaConfig(fixture_mode=True))
    samples = client.get_samples()
    assert len(samples) == 5
    for s in samples:
        assert isinstance(s, TelemetrySample)
        assert s.quality == Quality.GOOD
        assert "opcua" in s.tags["connector"]
        assert s.audit_hash != ""


def test_opcua_no_live_connection():
    client = OpcUaConnectorClient(OpcUaConfig(fixture_mode=False))
    try:
        client.read_nodes()
        assert False, "Expected NotImplementedError"
    except NotImplementedError:
        pass
