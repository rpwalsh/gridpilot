"""
OpenTelemetry/OTLP platform observability connector.

Exposes Dispatch Layer's own service telemetry:
  - API request latency (p50/p95/p99)
  - Provider ingest latency
  - Forecast computation time
  - Data freshness
  - Collector state
  - Dropped spans / error rate

This connector instruments the platform itself.
It does not ingest SCADA or operational telemetry.
All connector paths are read-only.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class CollectorState(str, Enum):
    RUNNING  = "RUNNING"
    DEGRADED = "DEGRADED"
    STOPPED  = "STOPPED"
    UNKNOWN  = "UNKNOWN"


@dataclass(frozen=True)
class OtelConfig:
    """Configuration for the OpenTelemetry collector endpoint."""

    endpoint:         str  = "http://localhost:4317"    # OTLP gRPC
    metrics_endpoint: str  = "http://localhost:4318/v1/metrics"  # OTLP HTTP
    service_name:     str  = "dispatchlayer-api"
    fixture_mode:     bool = True   # True = return fixture data; False = query live collector


@dataclass
class PlatformMetric:
    """A single platform observability metric sample."""

    name:        str
    value:       float
    unit:        str
    description: str


@dataclass
class CollectorStatus:
    """Snapshot of the OpenTelemetry collector state."""

    state:               CollectorState
    endpoint:            str
    service_name:        str
    spans_received:      int
    spans_dropped:       int
    metrics_received:    int
    export_queue_depth:  int
    metrics:             list[PlatformMetric] = field(default_factory=list)
