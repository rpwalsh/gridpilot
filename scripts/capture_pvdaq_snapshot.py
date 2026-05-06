# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Capture a PVDAQ CSV export and convert it into a DispatchLayer source snapshot.

Usage examples:
  python scripts/capture_pvdaq_snapshot.py \
    --csv-url "https://example.org/pvdaq_export.csv" \
    --site-id PVDAQ_RDK \
    --asset-id PVDAQ_RDK_INV_01 \
    --capacity-kw 950

  python scripts/capture_pvdaq_snapshot.py \
    --csv-file data/raw/pvdaq_export.csv \
    --site-id PVDAQ_RDK
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

SOURCE_SCHEMA_VERSION = "dispatchlayer.source.v1"

TIMESTAMP_CANDIDATES = [
    "timestamp",
    "time",
    "datetime",
    "date_time",
    "date/time",
    "date-time",
]

METRIC_ALIASES = {
    "ac_power": ["ac_power", "ac_power_kw", "ac power", "power_kw", "power"],
    "temperature_c": ["temperature_c", "ambient_temp", "air_temperature", "temperature"],
    "wind_speed_mps": ["wind_speed_mps", "wind_speed", "windspeed"],
    "ghi_wm2": ["ghi", "ghi_wm2", "irradiance", "global_irradiance"],
    "quality_score": ["quality_score", "data_quality", "quality"],
}


def _slug(value: str) -> str:
    return value.strip().lower().replace("-", "_").replace(" ", "_")


def _read_csv_bytes(csv_url: str | None, csv_file: Path | None) -> bytes:
    if csv_url:
        with urlopen(csv_url, timeout=30) as resp:  # nosec B310 - expected public dataset URL
            return resp.read()
    if csv_file is None:
        raise ValueError("Either --csv-url or --csv-file is required")
    return csv_file.read_bytes()


def _find_timestamp_column(fieldnames: list[str]) -> str | None:
    by_slug = {_slug(name): name for name in fieldnames}
    for candidate in TIMESTAMP_CANDIDATES:
        hit = by_slug.get(candidate)
        if hit:
            return hit
    for name in fieldnames:
        if "time" in _slug(name) or "date" in _slug(name):
            return name
    return None


def _metric_columns(fieldnames: list[str]) -> dict[str, str]:
    by_slug = {_slug(name): name for name in fieldnames}
    out: dict[str, str] = {}
    for canonical, aliases in METRIC_ALIASES.items():
        for alias in aliases:
            hit = by_slug.get(_slug(alias))
            if hit:
                out[canonical] = hit
                break
    return out


def _parse_ts(raw: str) -> datetime | None:
    value = raw.strip()
    if not value:
        return None
    # Accept either ISO strings with Z or naive values.
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _parse_float(raw: str) -> float | None:
    value = raw.strip().replace(",", "")
    if value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def build_snapshot(
    csv_bytes: bytes,
    *,
    site_id: str,
    asset_id: str,
    capacity_kw: float,
    source_url: str,
) -> dict:
    text = csv_bytes.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("CSV does not contain a header row")

    ts_col = _find_timestamp_column(reader.fieldnames)
    if ts_col is None:
        raise ValueError("Could not infer timestamp column from CSV header")

    metric_cols = _metric_columns(reader.fieldnames)
    if "ac_power" not in metric_cols:
        raise ValueError(
            "Could not infer an AC power column. Expected one of: "
            "ac_power, ac_power_kw, power_kw, power"
        )

    series: list[dict] = []
    for row in reader:
        ts_raw = row.get(ts_col, "")
        ts = _parse_ts(ts_raw)
        if ts is None:
            continue

        for metric_name, col in metric_cols.items():
            raw = row.get(col, "")
            value = _parse_float(raw)
            if value is None:
                continue

            if metric_name == "quality_score":
                value = max(0.0, min(1.0, value))

            unit = {
                "ac_power": "kW",
                "temperature_c": "C",
                "wind_speed_mps": "m/s",
                "ghi_wm2": "W/m2",
                "quality_score": "ratio",
            }.get(metric_name, "")

            series.append(
                {
                    "timestamp_utc": ts.isoformat().replace("+00:00", "Z"),
                    "metric": metric_name,
                    "value": value,
                    "unit": unit,
                    "quality": "GOOD",
                    "source": "PVDAQ",
                }
            )

    if not series:
        raise ValueError("No numeric time-series values were parsed from the CSV")

    captured_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    digest = hashlib.sha256(csv_bytes).hexdigest()

    return {
        "dataset_id": f"pvdaq_{site_id.lower()}_{len(series)}pts",
        "schema_version": SOURCE_SCHEMA_VERSION,
        "source_record": {
            "provider": "NREL PVDAQ",
            "source_type": "pv_system_performance",
            "captured_at_utc": captured_at,
            "source_url": source_url,
            "content_sha256": digest,
            "query": {
                "site_id": site_id,
                "cadence": "source_csv",
            },
        },
        "site": {
            "site_id": site_id,
            "asset_id": asset_id,
            "asset_type": "solar_inverter",
            "capacity_kw": capacity_kw,
        },
        "series": series,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert PVDAQ CSV export into source snapshot JSON")
    parser.add_argument("--csv-url", default=None, help="Public CSV URL")
    parser.add_argument("--csv-file", default=None, help="Local CSV file path")
    parser.add_argument("--site-id", required=True, help="Logical DispatchLayer site ID")
    parser.add_argument("--asset-id", default=None, help="Optional asset ID (defaults to <site>-PVDAQ-INV-01)")
    parser.add_argument("--capacity-kw", type=float, default=1000.0, help="Asset capacity in kW")
    parser.add_argument(
        "--output",
        default=None,
        help="Output JSON path (default: data/source_snapshots/pvdaq_<site>_snapshot.json)",
    )
    args = parser.parse_args()

    if not args.csv_url and not args.csv_file:
        raise SystemExit("Provide one input source: --csv-url or --csv-file")

    csv_file = Path(args.csv_file) if args.csv_file else None
    csv_bytes = _read_csv_bytes(args.csv_url, csv_file)

    asset_id = args.asset_id or f"{args.site_id}-PVDAQ-INV-01"
    source_url = args.csv_url or str(csv_file)

    snapshot = build_snapshot(
        csv_bytes,
        site_id=args.site_id,
        asset_id=asset_id,
        capacity_kw=args.capacity_kw,
        source_url=source_url,
    )

    default_out = Path("data/source_snapshots") / f"pvdaq_{args.site_id.lower()}_snapshot.json"
    output = Path(args.output) if args.output else default_out
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")

    print(f"wrote {output} ({len(snapshot['series'])} series points)")


if __name__ == "__main__":
    main()
