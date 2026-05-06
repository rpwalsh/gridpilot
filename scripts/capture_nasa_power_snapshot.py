# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Capture 5-year NASA POWER hourly data (no API key required) into a source snapshot."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dispatchlayer_adapter_nasa_power.client import NasaPowerClient
from dispatchlayer_domain.models import GeoPoint, ForecastWindow


async def _capture(site_id: str, asset_id: str, latitude: float, longitude: float, years: int, output: Path) -> None:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=365 * years)
    window = ForecastWindow(start_utc=start, end_utc=end, resolution_minutes=60)
    location = GeoPoint(latitude=latitude, longitude=longitude)

    client = NasaPowerClient()
    resource = await client.get_solar_resource(location, window)

    series: list[dict] = []
    for s in resource.samples:
        ts = s.timestamp_utc.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        if s.ghi_wm2 is not None:
            series.append({"timestamp_utc": ts, "metric": "ghi_wm2", "value": float(s.ghi_wm2), "unit": "W/m2", "quality": "GOOD", "source": "NASA_POWER"})
        if s.temperature_c is not None:
            series.append({"timestamp_utc": ts, "metric": "temperature_c", "value": float(s.temperature_c), "unit": "C", "quality": "GOOD", "source": "NASA_POWER"})

    digest = hashlib.sha256(json.dumps(series, sort_keys=True).encode("utf-8")).hexdigest()
    captured_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    snapshot = {
        "dataset_id": f"nasa_power_{site_id.lower()}_{years}y_{len(series)}pts",
        "schema_version": "dispatchlayer.source.v1",
        "source_record": {
            "provider": "NASA POWER",
            "source_type": "solar_resource_hourly",
            "captured_at_utc": captured_at,
            "source_url": "https://power.larc.nasa.gov/api/temporal/hourly/point",
            "content_sha256": digest,
            "query": {
                "latitude": latitude,
                "longitude": longitude,
                "start": start.date().isoformat(),
                "end": end.date().isoformat(),
            },
        },
        "site": {
            "site_id": site_id,
            "asset_id": asset_id,
            "asset_type": "solar_inverter",
            "capacity_kw": 1000.0,
        },
        "series": series,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    print(f"wrote {output} ({len(series)} points)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture NASA POWER 5-year snapshot")
    parser.add_argument("--site-id", default="MCW")
    parser.add_argument("--asset-id", default="MCW-NASA-SOLAR-01")
    parser.add_argument("--latitude", type=float, default=43.6)
    parser.add_argument("--longitude", type=float, default=-93.2)
    parser.add_argument("--years", type=int, default=5)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    output = Path(args.output) if args.output else Path("data/source_snapshots") / f"nasa_power_{args.site_id.lower()}_snapshot.json"
    asyncio.run(_capture(args.site_id, args.asset_id, args.latitude, args.longitude, args.years, output))


if __name__ == "__main__":
    main()
