# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Capture Open-Meteo forecast data into a DispatchLayer source snapshot.

Usage:
  python scripts/capture_open_meteo_snapshot.py \
    --site-id MCW \
    --asset-id MCW-WX-01 \
    --latitude 43.6 \
    --longitude -93.2 \
    --hours 72
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dispatchlayer_adapter_open_meteo.client import OpenMeteoClient
from dispatchlayer_domain.models import GeoPoint, ForecastWindow


def _to_snapshot(
    *,
    site_id: str,
    asset_id: str,
    latitude: float,
    longitude: float,
    capacity_kw: float,
    samples,
) -> dict:
    series: list[dict] = []
    for sample in samples:
        ts = sample.timestamp_utc.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

        if sample.shortwave_radiation_wm2 is not None:
            series.append(
                {
                    "timestamp_utc": ts,
                    "metric": "ghi_wm2",
                    "value": float(sample.shortwave_radiation_wm2),
                    "unit": "W/m2",
                    "quality": "GOOD",
                    "source": "OPEN_METEO",
                }
            )

        if sample.temperature_c is not None:
            series.append(
                {
                    "timestamp_utc": ts,
                    "metric": "temperature_c",
                    "value": float(sample.temperature_c),
                    "unit": "C",
                    "quality": "GOOD",
                    "source": "OPEN_METEO",
                }
            )

        if sample.wind_speed_mps is not None:
            series.append(
                {
                    "timestamp_utc": ts,
                    "metric": "wind_speed_mps",
                    "value": float(sample.wind_speed_mps),
                    "unit": "m/s",
                    "quality": "GOOD",
                    "source": "OPEN_METEO",
                }
            )

    payload_for_hash = json.dumps(series, sort_keys=True).encode("utf-8")
    digest = hashlib.sha256(payload_for_hash).hexdigest()
    captured_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return {
        "dataset_id": f"open_meteo_{site_id.lower()}_{len(series)}pts",
        "schema_version": "dispatchlayer.source.v1",
        "source_record": {
            "provider": "Open-Meteo",
            "source_type": "weather_forecast",
            "captured_at_utc": captured_at,
            "source_url": "https://api.open-meteo.com/v1/forecast",
            "content_sha256": digest,
            "query": {
                "latitude": latitude,
                "longitude": longitude,
            },
        },
        "site": {
            "site_id": site_id,
            "asset_id": asset_id,
            "asset_type": "weather_station",
            "capacity_kw": capacity_kw,
        },
        "series": series,
    }


async def _capture(
    *,
    site_id: str,
    asset_id: str,
    latitude: float,
    longitude: float,
    capacity_kw: float,
    hours: int,
    output: Path,
) -> None:
    now = datetime.now(timezone.utc)
    window = ForecastWindow(
        start_utc=now,
        end_utc=now + timedelta(hours=hours),
        resolution_minutes=60,
    )
    location = GeoPoint(latitude=latitude, longitude=longitude)

    client = OpenMeteoClient()
    forecast = await client.get_forecast(location, window)
    snapshot = _to_snapshot(
        site_id=site_id,
        asset_id=asset_id,
        latitude=latitude,
        longitude=longitude,
        capacity_kw=capacity_kw,
        samples=forecast.samples,
    )

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    print(f"wrote {output} ({len(snapshot['series'])} points)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture Open-Meteo source snapshot")
    parser.add_argument("--site-id", required=True)
    parser.add_argument("--asset-id", default=None)
    parser.add_argument("--latitude", type=float, required=True)
    parser.add_argument("--longitude", type=float, required=True)
    parser.add_argument("--capacity-kw", type=float, default=1000.0)
    parser.add_argument("--hours", type=int, default=72)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    asset_id = args.asset_id or f"{args.site_id}-WX-01"
    default_out = Path("data/source_snapshots") / f"open_meteo_{args.site_id.lower()}_snapshot.json"
    output = Path(args.output) if args.output else default_out

    asyncio.run(
        _capture(
            site_id=args.site_id,
            asset_id=asset_id,
            latitude=args.latitude,
            longitude=args.longitude,
            capacity_kw=args.capacity_kw,
            hours=args.hours,
            output=output,
        )
    )


if __name__ == "__main__":
    main()
