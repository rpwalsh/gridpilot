"""
Connector state endpoint.

Returns the current state of all configured platform connectors.
Read-only.  No command or control paths.
"""
from fastapi import APIRouter
from datetime import datetime, timezone

from dispatchlayer_connector_otel.client import OtelConnectorClient
from dispatchlayer_connector_otel.config import OtelConfig
from dispatchlayer_connector_opcua.client import OpcUaConnectorClient
from dispatchlayer_connector_opcua.config import OpcUaConfig
from dispatchlayer_connector_mqtt.client import MqttConnectorClient
from dispatchlayer_connector_mqtt.config import MqttConfig
from dispatchlayer_connector_sitewise.client import SiteWiseConnectorClient
from dispatchlayer_connector_sitewise.config import SiteWiseConfig
from dispatchlayer_connector_parquet.client import ParquetConnectorClient
from dispatchlayer_connector_parquet.config import ParquetConfig

router = APIRouter(tags=["connectors"])


@router.get("/connectors/state")
async def connector_state() -> dict:
    """
    Return the current state of all platform connectors.
    All connectors run in fixture_mode for offline/CI operation.
    """
    ts = datetime.now(timezone.utc).isoformat()
    connectors = []

    # OpenTelemetry
    try:
        otel = OtelConnectorClient(OtelConfig(fixture_mode=True))
        status = otel.get_collector_status()
        samples = otel.get_platform_samples()
        connectors.append({
            "connector":       "OTEL_COLLECTOR",
            "protocol":        "OTLP",
            "state":           status.state.value,
            "sample_count":    len(samples),
            "spans_received":  status.spans_received,
            "spans_dropped":   status.spans_dropped,
            "error":           None,
        })
    except Exception as e:
        connectors.append({"connector": "OTEL_COLLECTOR", "protocol": "OTLP", "state": "ERROR", "error": str(e)})

    # OPC UA
    try:
        opcua = OpcUaConnectorClient(OpcUaConfig(fixture_mode=True))
        nodes = opcua.read_nodes()
        connectors.append({
            "connector":    "OPCUA_SCADA",
            "protocol":     "OPC UA",
            "state":        "RUNNING",
            "sample_count": len(nodes),
            "quality_good": sum(1 for n in nodes if n.quality.value == "GOOD"),
            "error":        None,
        })
    except Exception as e:
        connectors.append({"connector": "OPCUA_SCADA", "protocol": "OPC UA", "state": "ERROR", "error": str(e)})

    # MQTT
    try:
        mqtt = MqttConnectorClient(MqttConfig(fixture_mode=True))
        messages = mqtt.get_messages()
        samples = mqtt.get_samples()
        missing = sum(1 for s in samples if s.quality.value == "MISSING")
        connectors.append({
            "connector":     "MQTT_GATEWAY",
            "protocol":      "MQTT",
            "state":         "RUNNING",
            "sample_count":  len(messages),
            "missing_count": missing,
            "error":         None,
        })
    except Exception as e:
        connectors.append({"connector": "MQTT_GATEWAY", "protocol": "MQTT", "state": "ERROR", "error": str(e)})

    # SiteWise
    try:
        sw = SiteWiseConnectorClient(SiteWiseConfig(fixture_mode=True))
        props = sw.get_property_values()
        connectors.append({
            "connector":    "SITEWISE_PROD",
            "protocol":     "AWS SiteWise",
            "state":        "RUNNING",
            "sample_count": len(props),
            "error":        None,
        })
    except Exception as e:
        connectors.append({"connector": "SITEWISE_PROD", "protocol": "AWS SiteWise", "state": "ERROR", "error": str(e)})

    # Parquet Archive
    try:
        from datetime import datetime
        parquet = ParquetConnectorClient(ParquetConfig(fixture_mode=True))
        start = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)
        end   = datetime(2025, 1, 1, 23, 59, tzinfo=timezone.utc)
        rows = parquet.query_series("SOLAR_PLANT_01", "active_power_kw", start, end)
        connectors.append({
            "connector":    "S3_PARQUET_ARCHIVE",
            "protocol":     "S3/Parquet",
            "state":        "RUNNING",
            "sample_count": len(rows),
            "error":        None,
        })
    except Exception as e:
        connectors.append({"connector": "S3_PARQUET_ARCHIVE", "protocol": "S3/Parquet", "state": "ERROR", "error": str(e)})

    return {
        "timestamp_utc": ts,
        "connector_count": len(connectors),
        "connectors": connectors,
    }


@router.get("/connectors/protocols")
async def list_protocols() -> dict:
    return {
        "protocols": [
            {"id": "OTLP",        "name": "OpenTelemetry/OTLP", "purpose": "platform_observability", "read_only": True},
            {"id": "OPC_UA",      "name": "OPC UA",              "purpose": "scada_interoperability",  "read_only": True},
            {"id": "MQTT",        "name": "MQTT",                "purpose": "edge_telemetry_stream",   "read_only": True},
            {"id": "SITEWISE",    "name": "AWS IoT SiteWise",    "purpose": "industrial_asset_data",   "read_only": True},
            {"id": "S3_PARQUET",  "name": "S3/Parquet",          "purpose": "historical_archive_replay", "read_only": True},
        ]
    }
