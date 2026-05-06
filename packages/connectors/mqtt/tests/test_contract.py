# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Contract test for MQTT connector using local fixture."""
from dispatchlayer_connector_mqtt.client import MqttConnectorClient
from dispatchlayer_connector_mqtt.config import MqttConfig
from dispatchlayer_domain.telemetry import TelemetrySample, Quality


def test_mqtt_get_messages_fixture():
    client = MqttConnectorClient(MqttConfig(fixture_mode=True))
    messages = client.get_messages()
    assert len(messages) == 4
    # First message is WTG001 active power
    m = messages[0]
    assert "WTG001" in m.topic
    assert m.payload["value"] == 1843.5
    assert m.qos == 1


def test_mqtt_missing_quality():
    client = MqttConnectorClient(MqttConfig(fixture_mode=True))
    samples = client.get_samples()
    missing = [s for s in samples if s.quality == Quality.MISSING]
    assert len(missing) == 1
    assert missing[0].value is None


def test_mqtt_samples_output():
    client = MqttConnectorClient(MqttConfig(fixture_mode=True))
    samples = client.get_samples()
    assert len(samples) == 4
    for s in samples:
        assert isinstance(s, TelemetrySample)
        assert "mqtt" in s.tags["connector"]
        assert s.audit_hash != ""


def test_mqtt_no_live_connection():
    client = MqttConnectorClient(MqttConfig(fixture_mode=False))
    try:
        client.get_messages()
        assert False, "Expected NotImplementedError"
    except NotImplementedError:
        pass
