# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""Capture OpenWind-style turbine telemetry CSV into a source snapshot.

Use either a direct CSV URL or a local CSV file.

Usage:
  python scripts/capture_openwind_snapshot.py \
    --csv-url "https://raw.githubusercontent.com/.../turbine.csv" \
    --site-id MISO_WIND_01 \
    --asset-id WT-01 \
    --years 5
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import urlopen

TIMESTAMP_CANDIDATES = [
    "timestamp",
    "time",
    "datetime",
    "date_time",
    "date/time",
    "date-time",
]

METRIC_ALIASES = {
    "wind_speed_mps": ["wind_speed_mps", "wind_speed", "windspeed"],
    "ac_power": ["ac_power", "power_kw", "active_power", "power"],
    "rotor_rpm": ["rotor_rpm", "rotor_speed", "rotor speed"],
    "generator_rpm": ["generator_rpm", "generator_speed", "gen_speed"],
    "blade_pitch_deg": ["blade_pitch_deg", "pitch_angle", "pitch"],
    "temperature_c": ["temperature_c", "ambient_temp", "temperature"],
    "quality_score": ["quality_score", "quality", "data_quality"],
}


def _slug(value: str) -> str:
    return value.strip().lower().replace("-", "_").replace(" ", "_")


def _read_csv_bytes(csv_url: str | None, csv_file: Path | None) -> bytes:
    if csv_url:
        with urlopen(csv_url, timeout=30) as resp:  # nosec B310 expected trusted dataset URL
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
        s = _slug(name)
        if "time" in s or "date" in s:
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
    years: int,
) -> dict:
    text = csv_bytes.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("CSV does not contain a header row")

    ts_col = _find_timestamp_column(reader.fieldnames)
    if ts_col is None:
        raise ValueError("Could not infer timestamp column from CSV header")

    metric_cols = _metric_columns(reader.fieldnames)
    if "ac_power" not in metric_cols and "wind_speed_mps" not in metric_cols:
        raise ValueError("Need at least wind speed or power column")

    rows: list[tuple[datetime, dict[str, float]]] = []
    for row in reader:
        ts = _parse_ts(row.get(ts_col, ""))
        if ts is None:
            continue
        values: dict[str, float] = {}
        for metric_name, col in metric_cols.items():
            val = _parse_float(row.get(col, ""))
            if val is None:
                continue
            if metric_name == "quality_score":
                val = max(0.0, min(1.0, val))
            values[metric_name] = val
        if values:
            rows.append((ts, values))

    if not rows:
        raise ValueError("No usable time-series values parsed")

    rows.sort(key=lambda x: x[0])
    cutoff = rows[-1][0] - timedelta(days=365 * years)
    rows = [r for r in rows if r[0] >= cutoff]

    series: list[dict] = []
    unit_map = {
        "wind_speed_mps": "m/s",
        "ac_power": "kW",
        "rotor_rpm": "rpm",
        "generator_rpm": "rpm",
        "blade_pitch_deg": "deg",
        "temperature_c": "C",
        "quality_score": "ratio",
    }

    for ts, values in rows:
        ts_iso = ts.isoformat().replace("+00:00", "Z")
        for metric, value in values.items():
            series.append(
                {
                    "timestamp_utc": ts_iso,
                    "metric": metric,
                    "value": value,
                    "unit": unit_map.get(metric, ""),
                    "quality": "GOOD",
                    "source": "OPENWINDSCADA",
                }
            )

    digest = hashlib.sha256(json.dumps(series, sort_keys=True).encode("utf-8")).hexdigest()
    captured_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return {
        "dataset_id": f"openwind_{site_id.lower()}_{years}y_{len(series)}pts",
        "schema_version": "dispatchlayer.source.v1",
        "source_record": {
            "provider": "OpenWindSCADA",
            "source_type": "wind_turbine_scada",
            "captured_at_utc": captured_at,
            "source_url": source_url,
            "content_sha256": digest,
            "query": {
                "site_id": site_id,
                "years": years,
            },
        },
        "site": {
            "site_id": site_id,
            "asset_id": asset_id,
            "asset_type": "wind_turbine",
            "capacity_kw": capacity_kw,
        },
        "series": series,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture OpenWindSCADA CSV into source snapshot")
    parser.add_argument("--csv-url", default=None)
    parser.add_argument("--csv-file", default=None)
    parser.add_argument("--site-id", required=True)
    parser.add_argument("--asset-id", default=None)
    parser.add_argument("--capacity-kw", type=float, default=2500.0)
    parser.add_argument("--years", type=int, default=5)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    if not args.csv_url and not args.csv_file:
        raise SystemExit("Provide one input source: --csv-url or --csv-file")

    csv_file = Path(args.csv_file) if args.csv_file else None
    csv_bytes = _read_csv_bytes(args.csv_url, csv_file)

    asset_id = args.asset_id or f"{args.site_id}-WT-01"
    source_url = args.csv_url or str(csv_file)

    snapshot = build_snapshot(
        csv_bytes,
        site_id=args.site_id,
        asset_id=asset_id,
        capacity_kw=args.capacity_kw,
        source_url=source_url,
        years=args.years,
    )

    default_out = Path("data/source_snapshots") / f"openwind_{args.site_id.lower()}_snapshot.json"
    output = Path(args.output) if args.output else default_out
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")

    print(f"wrote {output} ({len(snapshot['series'])} points)")


if __name__ == "__main__":
    main()
