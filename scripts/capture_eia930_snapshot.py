# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Capture multi-year EIA-930 data into a DispatchLayer source snapshot.

This script chunks requests so a five-year pull can complete without overlong
single queries.

Usage:
  python scripts/capture_eia930_snapshot.py --respondent MISO --years 5
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

import httpx

METRIC_TYPE_MAP = {
    "load": "D",
    "net_generation": "NG",
    "load_forecast": "DF",
}


def _utc_hour_start(d: date) -> datetime:
    return datetime.combine(d, time(0, 0, 0), tzinfo=timezone.utc)


def _chunk_windows(start: datetime, end: datetime, days_per_chunk: int = 180) -> list[tuple[datetime, datetime]]:
    windows: list[tuple[datetime, datetime]] = []
    cursor = start
    while cursor < end:
        nxt = min(cursor + timedelta(days=days_per_chunk), end)
        windows.append((cursor, nxt))
        cursor = nxt
    return windows


async def _fetch_metric_chunk(
    *,
    client: httpx.AsyncClient,
    api_key: str,
    respondent: str,
    type_code: str,
    start: datetime,
    end: datetime,
) -> list[dict]:
    url = "https://api.eia.gov/v2/electricity/rto/region-data/data/"
    params = {
        "api_key": api_key,
        "frequency": "hourly",
        "data[0]": "value",
        "facets[type][]": type_code,
        "facets[respondent][]": respondent,
        "start": start.strftime("%Y-%m-%dT%H"),
        "end": end.strftime("%Y-%m-%dT%H"),
        "sort[0][column]": "period",
        "sort[0][direction]": "asc",
        "offset": 0,
        "length": 5000,
    }
    resp = await client.get(url, params=params)
    resp.raise_for_status()
    return resp.json().get("response", {}).get("data", [])


async def _capture(
    *,
    respondent: str,
    years: int,
    metrics: list[str],
    output: Path,
) -> None:
    api_key = os.getenv("EIA_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("EIA_API_KEY is not set; cannot capture EIA-930 data")

    end_date = datetime.now(timezone.utc).date() + timedelta(days=1)
    start_date = date(end_date.year - years, end_date.month, end_date.day)
    start = _utc_hour_start(start_date)
    end = _utc_hour_start(end_date)

    series: list[dict] = []
    windows = _chunk_windows(start, end)

    async with httpx.AsyncClient(timeout=30) as client:
        for metric in metrics:
            type_code = METRIC_TYPE_MAP[metric]
            for w_start, w_end in windows:
                rows = await _fetch_metric_chunk(
                    client=client,
                    api_key=api_key,
                    respondent=respondent,
                    type_code=type_code,
                    start=w_start,
                    end=w_end,
                )
                for row in rows:
                    period = row.get("period")
                    value = row.get("value")
                    if period is None or value is None:
                        continue
                    try:
                        ts = datetime.fromisoformat(str(period)).astimezone(timezone.utc)
                        val = float(value)
                    except (ValueError, TypeError):
                        continue
                    series.append(
                        {
                            "timestamp_utc": ts.isoformat().replace("+00:00", "Z"),
                            "metric": metric,
                            "value": val,
                            "unit": "MW",
                            "quality": "GOOD",
                            "source": "EIA930",
                        }
                    )

    digest = hashlib.sha256(json.dumps(series, sort_keys=True).encode("utf-8")).hexdigest()
    captured_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    snapshot = {
        "dataset_id": f"eia930_{respondent.lower()}_{start_date.isoformat()}_{end_date.isoformat()}",
        "schema_version": "dispatchlayer.source.v1",
        "source_record": {
            "provider": "EIA",
            "source_type": "balancing_authority_hourly",
            "captured_at_utc": captured_at,
            "source_url": "https://www.eia.gov/electricity/gridmonitor/",
            "content_sha256": digest,
            "query": {
                "respondent": respondent,
                "metrics": metrics,
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
        },
        "site": {
            "site_id": respondent,
            "asset_id": f"{respondent}-GRID-CTX-01",
            "asset_type": "meter",
            "capacity_kw": 1.0,
        },
        "series": series,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    print(f"wrote {output} ({len(series)} points)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture EIA-930 multi-year snapshot")
    parser.add_argument("--respondent", default="MISO")
    parser.add_argument("--years", type=int, default=5)
    parser.add_argument("--metrics", default="load,net_generation,load_forecast")
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    metrics = [m.strip() for m in args.metrics.split(",") if m.strip()]
    unknown = [m for m in metrics if m not in METRIC_TYPE_MAP]
    if unknown:
        raise SystemExit(f"Unsupported metrics: {unknown}. Supported: {list(METRIC_TYPE_MAP.keys())}")

    default_out = Path("data/source_snapshots") / f"eia930_{args.respondent.lower()}_snapshot.json"
    output = Path(args.output) if args.output else default_out

    asyncio.run(
        _capture(
            respondent=args.respondent,
            years=args.years,
            metrics=metrics,
            output=output,
        )
    )


if __name__ == "__main__":
    main()
