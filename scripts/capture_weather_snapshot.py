"""
Capture a real weather source snapshot from Open-Meteo Archive API.

Usage:
    python scripts/capture_weather_snapshot.py \
        --lat 31.97 \
        --lon -102.08 \
        --start 2000-01-01 \
        --end 2024-12-31 \
        --out data/source_snapshots/weather/open_meteo_west_texas_monthly_2000_2024.json

The script fetches daily weather data from Open-Meteo Archive, aggregates to monthly
averages, and writes a normalized source snapshot JSON with metadata and content hash.

Open-Meteo Archive API requires no API key. Data is CC BY 4.0 for non-commercial use.
See: https://open-meteo.com/en/license

This script does NOT generate placeholder data. If the API is unavailable, it exits
with a machine-readable failure message.
"""

import argparse
import hashlib
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone


ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
SCHEMA_VERSION = "dispatchlayer.proof.weather.v1"


def build_url(lat: float, lon: float, start: str, end: str) -> str:
    params = {
        "latitude": str(lat),
        "longitude": str(lon),
        "start_date": start,
        "end_date": end,
        "daily": "shortwave_radiation_sum,wind_speed_10m_max,temperature_2m_mean",
        "timezone": "UTC",
    }
    return f"{ARCHIVE_URL}?{urllib.parse.urlencode(params)}"


def fetch(url: str, timeout: int = 60) -> dict:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DispatchLayer/0.1 capture-script"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.URLError as exc:
        print("SOURCE_CAPTURE_STATE: FAILED")
        print(f"REASON: API_UNAVAILABLE")
        print(f"DETAIL: {exc}")
        sys.exit(1)
    except Exception as exc:
        print("SOURCE_CAPTURE_STATE: FAILED")
        print(f"REASON: UNEXPECTED_ERROR")
        print(f"DETAIL: {exc}")
        sys.exit(1)


def aggregate_monthly(daily: dict) -> list[dict]:
    """Aggregate Open-Meteo daily records to calendar-month means."""
    times = daily.get("time", [])
    rad = daily.get("shortwave_radiation_sum", [])
    wind = daily.get("wind_speed_10m_max", [])
    temp = daily.get("temperature_2m_mean", [])

    buckets: dict[tuple, dict] = defaultdict(lambda: {
        "rad": [], "wind": [], "temp": [],
    })

    for i, t in enumerate(times):
        d = datetime.strptime(t, "%Y-%m-%d")
        key = (d.year, d.month)
        if rad[i] is not None:
            buckets[key]["rad"].append(rad[i])
        if wind[i] is not None:
            buckets[key]["wind"].append(wind[i])
        if temp[i] is not None:
            buckets[key]["temp"].append(temp[i])

    records = []
    for (year, month), vals in sorted(buckets.items()):
        rec: dict = {
            "timestamp_utc": f"{year:04d}-{month:02d}-01T00:00:00Z",
            "year": year,
            "month": month,
            "quality": "GOOD",
        }
        if vals["rad"]:
            rec["shortwave_radiation_sum_mjm2"] = round(sum(vals["rad"]) / len(vals["rad"]), 3)
        if vals["wind"]:
            rec["wind_speed_10m_max_ms"] = round(sum(vals["wind"]) / len(vals["wind"]), 3)
        if vals["temp"]:
            rec["temperature_2m_mean_c"] = round(sum(vals["temp"]) / len(vals["temp"]), 3)
        if not vals["rad"] and not vals["wind"] and not vals["temp"]:
            rec["quality"] = "MISSING"
        records.append(rec)

    return records


def sha256_records(records: list[dict]) -> str:
    payload = json.dumps(records, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def build_snapshot(
    lat: float,
    lon: float,
    start: str,
    end: str,
    records: list[dict],
    raw_meta: dict,
    training_end: str,
    holdout_start: str,
) -> dict:
    missing = sum(1 for r in records if r.get("quality") == "MISSING")
    content_hash = sha256_records(records)

    # Derive dataset_id from coordinates and date range
    lat_tag = f"n{int(lat)}" if lat >= 0 else f"s{int(abs(lat))}"
    lon_tag = f"e{int(lon)}" if lon >= 0 else f"w{int(abs(lon))}"
    dataset_id = f"open_meteo_{lat_tag}_{lon_tag}_monthly_{start[:4]}_{end[:4]}"

    return {
        "dataset_id": dataset_id,
        "schema_version": SCHEMA_VERSION,
        "source_record": {
            "provider": "Open-Meteo Archive API",
            "source_type": "weather_api_snapshot",
            "latitude": lat,
            "longitude": lon,
            "elevation_m": raw_meta.get("elevation"),
            "timezone": raw_meta.get("timezone", "UTC"),
            "captured_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source_url": ARCHIVE_URL,
            "license_or_terms": "Open-Meteo data CC BY 4.0 non-commercial / see open-meteo.com/en/license",
            "query": {
                "start": start,
                "end": end,
                "daily": [
                    "shortwave_radiation_sum",
                    "wind_speed_10m_max",
                    "temperature_2m_mean",
                ],
                "aggregation": "monthly_mean_of_daily",
            },
        },
        "windows": {
            "training": {
                "start_utc": f"{start}T00:00:00Z",
                "end_utc": f"{training_end}T23:59:59Z",
            },
            "holdout": {
                "start_utc": f"{holdout_start}T00:00:00Z",
                "end_utc": f"{end}T23:59:59Z",
            },
        },
        "integrity": {
            "record_count": len(records),
            "missing_count": missing,
            "content_sha256": content_hash,
        },
        "series": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Capture weather source snapshot from Open-Meteo Archive API.",
    )
    parser.add_argument("--lat", type=float, required=True, help="Latitude")
    parser.add_argument("--lon", type=float, required=True, help="Longitude")
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", required=True, help="End date YYYY-MM-DD")
    parser.add_argument("--out", required=True, help="Output JSON file path")
    parser.add_argument(
        "--holdout-start",
        default=None,
        help="First date of holdout window (default: first day of last year in range)",
    )
    parser.add_argument("--timeout", type=int, default=60, help="HTTP timeout seconds")
    args = parser.parse_args()

    # Determine holdout split
    end_year = int(args.end[:4])
    holdout_start = args.holdout_start or f"{end_year}-01-01"
    training_end_dt = datetime(int(holdout_start[:4]) - 1, 12, 31)
    training_end = training_end_dt.strftime("%Y-%m-%d")

    print(f"SOURCE_CAPTURE_STATE: FETCHING")
    print(f"PROVIDER: Open-Meteo Archive API")
    print(f"LOCATION: lat={args.lat} lon={args.lon}")
    print(f"RANGE: {args.start} → {args.end}")
    print(f"TRAINING: {args.start} → {training_end}")
    print(f"HOLDOUT: {holdout_start} → {args.end}")

    url = build_url(args.lat, args.lon, args.start, args.end)
    raw = fetch(url, timeout=args.timeout)

    if "daily" not in raw:
        print("SOURCE_CAPTURE_STATE: FAILED")
        print("REASON: NO_DAILY_DATA_IN_RESPONSE")
        print(f"RESPONSE_KEYS: {list(raw.keys())}")
        sys.exit(1)

    print(f"SOURCE_CAPTURE_STATE: AGGREGATING")
    records = aggregate_monthly(raw["daily"])

    snapshot = build_snapshot(
        lat=args.lat,
        lon=args.lon,
        start=args.start,
        end=args.end,
        records=records,
        raw_meta=raw,
        training_end=training_end,
        holdout_start=holdout_start,
    )

    import os
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)

    print(f"SOURCE_CAPTURE_STATE: COMPLETE")
    print(f"DATASET_ID: {snapshot['dataset_id']}")
    print(f"RECORD_COUNT: {snapshot['integrity']['record_count']}")
    print(f"MISSING_COUNT: {snapshot['integrity']['missing_count']}")
    print(f"SHA256: {snapshot['integrity']['content_sha256']}")
    print(f"OUT: {args.out}")


if __name__ == "__main__":
    main()
