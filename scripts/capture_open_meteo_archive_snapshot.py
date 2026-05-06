# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Capture 5-year Open-Meteo archive hourly data (no API key) into a source snapshot."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture Open-Meteo archive 5-year snapshot")
    parser.add_argument("--site-id", default="MCW")
    parser.add_argument("--asset-id", default="MCW-OPENMETEO-WX-01")
    parser.add_argument("--latitude", type=float, default=43.6)
    parser.add_argument("--longitude", type=float, default=-93.2)
    parser.add_argument("--years", type=int, default=5)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=365 * args.years)

    params = {
        "latitude": args.latitude,
        "longitude": args.longitude,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": "temperature_2m,wind_speed_10m,shortwave_radiation",
        "timezone": "UTC",
        "wind_speed_unit": "ms",
    }

    with httpx.Client(timeout=60) as client:
        r = client.get("https://archive-api.open-meteo.com/v1/archive", params=params)
        r.raise_for_status()
        data = r.json()

    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    winds = hourly.get("wind_speed_10m", [])
    ghi = hourly.get("shortwave_radiation", [])

    series: list[dict] = []
    for i, t in enumerate(times):
        ts = datetime.fromisoformat(t).replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        if i < len(temps) and temps[i] is not None:
            series.append({"timestamp_utc": ts, "metric": "temperature_c", "value": float(temps[i]), "unit": "C", "quality": "GOOD", "source": "OPEN_METEO_ARCHIVE"})
        if i < len(winds) and winds[i] is not None:
            series.append({"timestamp_utc": ts, "metric": "wind_speed_mps", "value": float(winds[i]), "unit": "m/s", "quality": "GOOD", "source": "OPEN_METEO_ARCHIVE"})
        if i < len(ghi) and ghi[i] is not None:
            series.append({"timestamp_utc": ts, "metric": "ghi_wm2", "value": float(ghi[i]), "unit": "W/m2", "quality": "GOOD", "source": "OPEN_METEO_ARCHIVE"})

    digest = hashlib.sha256(json.dumps(series, sort_keys=True).encode("utf-8")).hexdigest()
    captured_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    snapshot = {
        "dataset_id": f"open_meteo_archive_{args.site_id.lower()}_{args.years}y_{len(series)}pts",
        "schema_version": "dispatchlayer.source.v1",
        "source_record": {
            "provider": "Open-Meteo",
            "source_type": "archive_weather_hourly",
            "captured_at_utc": captured_at,
            "source_url": "https://archive-api.open-meteo.com/v1/archive",
            "content_sha256": digest,
            "query": {
                "latitude": args.latitude,
                "longitude": args.longitude,
                "start": start.isoformat(),
                "end": end.isoformat(),
            },
        },
        "site": {
            "site_id": args.site_id,
            "asset_id": args.asset_id,
            "asset_type": "weather_station",
            "capacity_kw": 1.0,
        },
        "series": series,
    }

    output = Path(args.output) if args.output else Path("data/source_snapshots") / f"open_meteo_archive_{args.site_id.lower()}_snapshot.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    print(f"wrote {output} ({len(series)} points)")


if __name__ == "__main__":
    main()
