# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
MQTT telemetry stream connector configuration.

Read-only subscriber for edge telemetry, gateway streams, and SiteWise-style
cloud ingestion over MQTT 3.1.1 / MQTT 5.0.
No publish, command, or control paths are implemented.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum


class QoS(IntEnum):
    AT_MOST_ONCE  = 0
    AT_LEAST_ONCE = 1
    EXACTLY_ONCE  = 2


@dataclass(frozen=True)
class MqttConfig:
    """MQTT broker connection parameters."""

    host:         str      = "localhost"
    port:         int      = 1883
    client_id:    str      = "dispatchlayer-connector"
    topics:       tuple[str, ...] = ("dispatchlayer/telemetry/#",)
    qos:          QoS      = QoS.AT_LEAST_ONCE
    fixture_mode: bool     = True   # True = return fixture data; False = connect live
    keepalive_s:  int      = 60
