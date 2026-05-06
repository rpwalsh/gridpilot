"""
OPC UA read-only connector client.

In fixture_mode (default), returns nodes from the recorded fixture.
In live mode, connects to the configured OPC UA endpoint and reads node values.

The client implements Browse + Read only.  No Write, Call, or Subscribe-with-
control paths are implemented.  Subscription for monitoring values is read-only.
"""
from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from dispatchlayer_domain.telemetry import TelemetrySample, Quality

from .config import OpcUaConfig, NodeQuality

FIXTURE_PATH = pathlib.Path(__file__).parent.parent.parent / "tests" / "fixtures" / "node_snapshot.json"


@dataclass
class OpcUaNodeValue:
    """A single OPC UA node read result."""

    node_id:           str
    browse_name:       str
    namespace:         int
    value:             float | str | bool | None
    source_timestamp:  datetime
    server_timestamp:  datetime
    quality:           NodeQuality
    unit:              Optional[str]


class OpcUaConnectorClient:
    """Read-only OPC UA client."""

    def __init__(self, config: OpcUaConfig | None = None) -> None:
        self._config = config or OpcUaConfig()

    def read_nodes(self, node_ids: list[str] | None = None) -> list[OpcUaNodeValue]:
        """
        Read current values for the specified node IDs (or all fixture nodes).
        Returns OpcUaNodeValue records.
        """
        if self._config.fixture_mode:
            return self._load_fixture(node_ids)
        raise NotImplementedError(
            "Live OPC UA requires asyncua — set fixture_mode=True for offline use"
        )

    def get_samples(self, node_ids: list[str] | None = None) -> list[TelemetrySample]:
        """Return node values as unified TelemetrySamples."""
        nodes = self.read_nodes(node_ids)
        now = datetime.now(timezone.utc)
        samples = []
        for n in nodes:
            quality = {
                NodeQuality.GOOD:      Quality.GOOD,
                NodeQuality.UNCERTAIN: Quality.UNCERTAIN,
                NodeQuality.BAD:       Quality.BAD,
                NodeQuality.MISSING:   Quality.MISSING,
            }.get(n.quality, Quality.UNCERTAIN)
            samples.append(TelemetrySample(
                source_id=f"opcua:{self._config.endpoint}",
                channel_id=n.node_id,
                asset_id=None,
                timestamp_utc=n.source_timestamp,
                value=n.value,
                unit=n.unit,
                quality=quality,
                source_timestamp_utc=n.source_timestamp,
                ingest_timestamp_utc=now,
                tags={
                    "browse_name": n.browse_name,
                    "namespace":   str(n.namespace),
                    "connector":   "opcua",
                },
            ))
        return samples

    def _load_fixture(self, node_ids: list[str] | None) -> list[OpcUaNodeValue]:
        data = json.loads(FIXTURE_PATH.read_text())
        nodes = []
        for item in data["nodes"]:
            if node_ids and item["node_id"] not in node_ids:
                continue
            nodes.append(OpcUaNodeValue(
                node_id=item["node_id"],
                browse_name=item["browse_name"],
                namespace=item["namespace"],
                value=item["value"],
                source_timestamp=datetime.fromisoformat(item["source_timestamp"]),
                server_timestamp=datetime.fromisoformat(item["server_timestamp"]),
                quality=NodeQuality(item["quality"]),
                unit=item.get("unit"),
            ))
        return nodes
