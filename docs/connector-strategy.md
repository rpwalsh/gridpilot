# Connector Strategy

Dispatch Layer uses read-only instrumentation connectors to ingest measured state
from utility and industrial systems.  Connectors expose timestamps, quality codes,
values, and metadata.  They do not produce language, advice, findings,
recommendations, or instructions.

## Connector categories

### Operational data connectors

Ingest SCADA/plant/utility telemetry.

| Connector     | Protocol        | Purpose                          | Phase |
|---------------|-----------------|----------------------------------|-------|
| OPC UA        | IEC 62541       | SCADA interoperability           | 1     |
| MQTT          | MQTT 3.1/5.0    | Edge telemetry stream            | 1     |
| AWS SiteWise  | REST/SDK        | Industrial asset time-series     | 1     |
| S3/Parquet    | S3 + Apache     | Historical archive and replay    | 1     |
| Modbus TCP    | Modbus          | Legacy industrial equipment      | 2     |
| DNP3          | IEEE 1815       | Electric utility telemetry       | 2     |
| IEC 61850     | IEC 61850       | Substation / grid automation     | 3     |
| C37.118/PMU   | IEEE C37.118    | Phasor measurement unit          | 3     |
| PI/AVEVA      | PI Web API      | Historian integration            | 2     |
| InfluxDB      | InfluxDB HTTP   | Time-series export               | 2     |
| Kafka         | Kafka protocol  | Streaming event backbone         | 2     |

### Platform observability connectors

Instrument Dispatch Layer itself.

| Connector          | Protocol  | Purpose                          | Phase |
|--------------------|-----------|----------------------------------|-------|
| OpenTelemetry/OTLP | OTLP      | API latency, traces, metrics     | 1     |
| Prometheus         | HTTP      | Metric scraping                  | 2     |

## Read-only guarantee

All connectors implement **read-only** paths only:

```
subscribe   — passive listener, no acknowledgement or control
read        — snapshot value read
query       — historical range query
replay      — deterministic historical playback from archive
```

The following are **not implemented** and must not be added:

```
write       — value write
command     — operational command
setpoint    — setpoint change
control     — any operational control path
```

## Unified output model

All connectors normalise output to `TelemetrySample`:

```python
@dataclass
class TelemetrySample:
    source_id:            str
    channel_id:           str
    timestamp_utc:        datetime
    value:                float | str | bool | None
    unit:                 str | None
    quality:              Quality          # GOOD | UNCERTAIN | BAD | MISSING | STALE
    ingest_timestamp_utc: datetime
    asset_id:             str | None = None
    source_timestamp_utc: datetime | None = None
    tags:                 dict[str, str] = field(default_factory=dict)
    audit_hash:           str = ""         # auto-computed SHA-256
```

No English interpretation.  Just samples.

## Connector Matrix (UI)

The Pipeline State page renders a live connector matrix:

| Connector          | Protocol     | State   | Samples | Latency p95 | Quality % |
|--------------------|--------------|---------|--------:|------------:|----------:|
| OTEL_COLLECTOR     | OTLP         | RUNNING |       7 |       48 ms |      100% |
| OPCUA_SCADA        | OPC UA       | RUNNING |       5 |          — |      100% |
| MQTT_GATEWAY       | MQTT         | RUNNING |       4 |          — |       75% |
| SITEWISE_PROD      | AWS SiteWise | RUNNING |       4 |          — |       75% |
| S3_PARQUET_ARCHIVE | S3/Parquet   | RUNNING |       5 |          — |      100% |

## Phase 1 roadmap (current)

- [x] OpenTelemetry/OTLP — platform observability
- [x] OPC UA — read-only SCADA (fixture + contract test)
- [x] MQTT — edge telemetry stream (fixture + contract test)
- [x] AWS IoT SiteWise — asset property values (fixture + contract test)
- [x] S3/Parquet — historical archive replay (fixture + contract test)
- [x] `/api/v1/connectors/state` endpoint
- [x] `PipelineState` frontend page

## Phase 2 roadmap

- [ ] Modbus TCP adapter skeleton
- [ ] DNP3 adapter skeleton
- [ ] PI/AVEVA Web API adapter
- [ ] InfluxDB adapter
- [ ] TimescaleDB adapter
- [ ] Prometheus remote read
- [ ] Kafka consumer adapter

## Phase 3 roadmap

- [ ] IEC 61850 model import
- [ ] C37.118 / synchrophasor stream
- [ ] Full OPC UA browse + subscription
- [ ] Kafka temporal playback archive
- [ ] Topology import adapter
