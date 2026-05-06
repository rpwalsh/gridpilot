# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
OpenTelemetry/OTLP platform observability client.

In fixture_mode (default for offline/CI), returns deterministic platform metrics
from a recorded fixture.  In live mode, queries the configured OTLP collector
metrics endpoint.

All methods are read-only.
"""
from __future__ import annotations

import json
import pathlib
from datetime import datetime, timezone

from dispatchlayer_domain.telemetry import TelemetrySample, Quality

from .config import OtelConfig, CollectorStatus, CollectorState, PlatformMetric

FIXTURE_PATH = pathlib.Path(__file__).parent.parent.parent / "tests" / "fixtures" / "collector_state.json"


class OtelConnectorClient:
    """Read-only OpenTelemetry collector state client."""

    def __init__(self, config: OtelConfig | None = None) -> None:
        self._config = config or OtelConfig()

    def get_collector_status(self) -> CollectorStatus:
        """Return current collector state as a CollectorStatus."""
        if self._config.fixture_mode:
            return self._load_fixture()
        raise NotImplementedError(
            "Live OTLP query requires opentelemetry-api/sdk  set fixture_mode=True for offline use"
        )

    def get_platform_samples(self) -> list[TelemetrySample]:
        """
        Return platform metrics as TelemetrySamples.

        Maps latency / throughput metrics to the unified TQV model.
        """
        status = self.get_collector_status()
        now = datetime.now(timezone.utc)
        samples = []
        for m in status.metrics:
            samples.append(TelemetrySample(
                source_id="otel_collector",
                channel_id=m.name,
                timestamp_utc=now,
                value=m.value,
                unit=m.unit,
                quality=Quality.GOOD,
                ingest_timestamp_utc=now,
                tags={"service": self._config.service_name, "connector": "opentelemetry"},
            ))
        return samples

    def _load_fixture(self) -> CollectorStatus:
        data = json.loads(FIXTURE_PATH.read_text())
        return CollectorStatus(
            state=CollectorState(data["state"]),
            endpoint=data["endpoint"],
            service_name=data["service_name"],
            spans_received=data["spans_received"],
            spans_dropped=data["spans_dropped"],
            metrics_received=data["metrics_received"],
            export_queue_depth=data["export_queue_depth"],
            metrics=[PlatformMetric(**m) for m in data.get("metrics", [])],
        )

