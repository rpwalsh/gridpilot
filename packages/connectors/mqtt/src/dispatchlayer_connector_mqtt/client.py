"""
MQTT telemetry stream connector client.

In fixture_mode (default), returns parsed messages from a recorded fixture.
In live mode, subscribes to the configured broker and yields TelemetrySamples
from received messages.

Read-only subscriber only.  No publish path is implemented.
"""
from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from dispatchlayer_domain.telemetry import TelemetrySample, Quality

from .config import MqttConfig, QoS

FIXTURE_PATH = pathlib.Path(__file__).parent.parent.parent / "tests" / "fixtures" / "message_batch.json"


@dataclass
class MqttMessage:
    """A single received MQTT message."""

    topic:     str
    payload:   dict
    qos:       int
    retained:  bool
    timestamp: datetime


class MqttConnectorClient:
    """Read-only MQTT subscriber client."""

    def __init__(self, config: MqttConfig | None = None) -> None:
        self._config = config or MqttConfig()

    def get_messages(self) -> list[MqttMessage]:
        """
        Return the latest batch of received messages.
        In fixture_mode, loads from the fixture file.
        """
        if self._config.fixture_mode:
            return self._load_fixture()
        raise NotImplementedError(
            "Live MQTT requires paho-mqtt — set fixture_mode=True for offline use"
        )

    def get_samples(self) -> list[TelemetrySample]:
        """Return messages as unified TelemetrySamples."""
        messages = self.get_messages()
        now = datetime.now(timezone.utc)
        samples = []
        for msg in messages:
            value = msg.payload.get("value")
            quality_str = msg.payload.get("quality", "GOOD").upper()
            try:
                quality = Quality(quality_str)
            except ValueError:
                quality = Quality.UNCERTAIN
            samples.append(TelemetrySample(
                source_id=f"mqtt:{self._config.host}:{self._config.port}",
                channel_id=msg.topic,
                asset_id=msg.payload.get("asset_id"),
                timestamp_utc=msg.timestamp,
                value=value,
                unit=msg.payload.get("unit"),
                quality=quality,
                source_timestamp_utc=msg.timestamp,
                ingest_timestamp_utc=now,
                tags={
                    "qos":      str(msg.qos),
                    "retained": str(msg.retained).lower(),
                    "connector": "mqtt",
                },
            ))
        return samples

    def _load_fixture(self) -> list[MqttMessage]:
        data = json.loads(FIXTURE_PATH.read_text())
        messages = []
        for m in data["messages"]:
            messages.append(MqttMessage(
                topic=m["topic"],
                payload=m["payload"],
                qos=m["qos"],
                retained=m.get("retained", False),
                timestamp=datetime.fromisoformat(m["timestamp"]),
            ))
        return messages
