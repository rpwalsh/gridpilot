# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from __future__ import annotations

import csv
import datetime as dt
import json
import subprocess
import time
import urllib.parse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw" / "curl"
SOLAR_DIR = RAW_DIR / "production_demo" / "solar"
WIND_DIR = RAW_DIR / "production_demo" / "wind"
CATALOG_PATH = RAW_DIR / "production_demo" / "catalog.json"
PVDAQ_SYSTEMS_CSV = RAW_DIR / "pvdaq_systems_20250729.csv"
PREFERRED_PVDAQ_SYSTEM_IDS = ["4", "10", "33", "50", "51"]
OPEN_METEO_CHUNK_SLEEP_SECONDS = 12.0


OPEN_METEO_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "apparent_temperature",
    "precipitation",
    "rain",
    "snowfall",
    "weather_code",
    "pressure_msl",
    "surface_pressure",
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "shortwave_radiation",
    "direct_radiation",
    "diffuse_radiation",
    "direct_normal_irradiance",
    "terrestrial_radiation",
    "wind_speed_10m",
    "wind_speed_80m",
    "wind_speed_120m",
    "wind_speed_180m",
    "wind_direction_10m",
    "wind_direction_80m",
    "wind_direction_120m",
    "wind_direction_180m",
    "wind_gusts_10m",
    "vapour_pressure_deficit",
    "et0_fao_evapotranspiration",
    "soil_temperature_0cm",
    "soil_temperature_6cm",
    "soil_moisture_0_to_1cm",
    "soil_moisture_1_to_3cm",
]


SOLAR_SITES = [
    {
        "site_id": "solar_nrel_golden_1",
        "name": "NREL Golden Site A",
        "latitude": 39.7406,
        "longitude": -105.1774,
        "region": "US-CO",
        "source": "open-meteo-archive",
    },
    {
        "site_id": "solar_las_vegas_1",
        "name": "Las Vegas PV Corridor",
        "latitude": 36.1716,
        "longitude": -115.1391,
        "region": "US-NV",
        "source": "open-meteo-archive",
    },
    {
        "site_id": "solar_phoenix_1",
        "name": "Phoenix Utility Solar Belt",
        "latitude": 33.4484,
        "longitude": -112.074,
        "region": "US-AZ",
        "source": "open-meteo-archive",
    },
    {
        "site_id": "solar_bakersfield_1",
        "name": "Bakersfield Solar Cluster",
        "latitude": 35.3733,
        "longitude": -119.0187,
        "region": "US-CA",
        "source": "open-meteo-archive",
    },
    {
        "site_id": "solar_albuquerque_1",
        "name": "Albuquerque Solar Zone",
        "latitude": 35.0844,
        "longitude": -106.6504,
        "region": "US-NM",
        "source": "open-meteo-archive",
    },
]


WIND_SITES = [
    {
        "site_id": "wind_abilene_1",
        "name": "Abilene Wind Belt",
        "latitude": 32.4487,
        "longitude": -99.7331,
        "region": "US-TX",
        "source": "open-meteo-archive",
    },
    {
        "site_id": "wind_guymon_1",
        "name": "Oklahoma Panhandle Wind",
        "latitude": 36.6828,
        "longitude": -101.4816,
        "region": "US-OK",
        "source": "open-meteo-archive",
    },
    {
        "site_id": "wind_dodge_city_1",
        "name": "Dodge City Wind Corridor",
        "latitude": 37.7528,
        "longitude": -100.0171,
        "region": "US-KS",
        "source": "open-meteo-archive",
    },
    {
        "site_id": "wind_cheyenne_1",
        "name": "Cheyenne High Plains Wind",
        "latitude": 41.14,
        "longitude": -104.8202,
        "region": "US-WY",
        "source": "open-meteo-archive",
    },
    {
        "site_id": "wind_des_moines_1",
        "name": "Iowa Central Wind",
        "latitude": 41.5868,
        "longitude": -93.625,
        "region": "US-IA",
        "source": "open-meteo-archive",
    },
]


def _validate_open_meteo_payload(output_path: Path) -> int:
    payload = json.loads(output_path.read_text(encoding="utf-8"))
    if payload.get("error"):
        reason = payload.get("reason", "unknown error")
        raise RuntimeError(f"Open-Meteo returned error for {output_path.name}: {reason}")
    hourly = payload.get("hourly") or {}
    points = len(hourly.get("time") or [])
    if points <= 0:
        raise RuntimeError(f"Open-Meteo returned no hourly points for {output_path.name}")
    return points


def _load_valid_cached_payload(output_path: Path) -> tuple[dict[str, object], int] | None:
    if not output_path.exists():
        return None
    try:
        payload = json.loads(output_path.read_text(encoding="utf-8"))
        points = _validate_open_meteo_payload(output_path)
    except Exception:
        return None
    return payload, points


def run_curl(url: str, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "curl.exe",
        "-sS",
        "-L",
        "--retry",
        "3",
        "--retry-delay",
        "2",
        "-o",
        str(output_path),
        url,
    ]
    subprocess.run(cmd, check=True)


def _to_nasa_date(d: str) -> str:
    return d.replace("-", "")


def build_year_chunks(start_date: str, end_date: str) -> list[tuple[str, str]]:
    start = dt.date.fromisoformat(start_date)
    end = dt.date.fromisoformat(end_date)
    chunks: list[tuple[str, str]] = []
    current = start
    while current <= end:
        chunk_end = min(dt.date(current.year, 12, 31), end)
        chunks.append((current.isoformat(), chunk_end.isoformat()))
        current = chunk_end + dt.timedelta(days=1)
    return chunks


def merge_hourly_payloads(payloads: list[dict[str, object]]) -> dict[str, object]:
    merged_hourly: dict[str, list[object]] = {}
    merged: dict[str, object] = {}

    for index, payload in enumerate(payloads):
        if index == 0:
            merged = {key: value for key, value in payload.items() if key != "hourly"}
        hourly = payload.get("hourly")
        if not isinstance(hourly, dict):
            continue
        for key, values in hourly.items():
            if not isinstance(values, list):
                continue
            merged_hourly.setdefault(key, []).extend(values)

    merged["hourly"] = merged_hourly
    return merged


def download_nasa_power_as_hourly(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
    output_path: Path,
) -> int:
    params = {
        "latitude": str(latitude),
        "longitude": str(longitude),
        "start": _to_nasa_date(start_date),
        "end": _to_nasa_date(end_date),
        "parameters": "ALLSKY_SFC_SW_DWN,T2M,WS10M,WD10M",
        "community": "RE",
        "format": "JSON",
        "time-standard": "UTC",
    }
    url = "https://power.larc.nasa.gov/api/temporal/hourly/point?" + urllib.parse.urlencode(params)
    run_curl(url, output_path)

    payload = json.loads(output_path.read_text(encoding="utf-8"))
    parameter = (
        payload.get("properties", {})
        .get("parameter", {})
    )
    ghi = parameter.get("ALLSKY_SFC_SW_DWN", {}) if isinstance(parameter.get("ALLSKY_SFC_SW_DWN", {}), dict) else {}
    t2m = parameter.get("T2M", {}) if isinstance(parameter.get("T2M", {}), dict) else {}
    ws10 = parameter.get("WS10M", {}) if isinstance(parameter.get("WS10M", {}), dict) else {}
    wd10 = parameter.get("WD10M", {}) if isinstance(parameter.get("WD10M", {}), dict) else {}

    time_keys = sorted([k for k in ghi.keys() if isinstance(k, str) and len(k) == 10])
    if not time_keys:
        raise RuntimeError(f"NASA POWER returned no hourly keys for {output_path.name}")

    out = {
        "provider": "nasa_power",
        "hourly": {
            "time": [],
            "temperature_2m": [],
            "shortwave_radiation": [],
            "wind_speed_10m": [],
            "wind_direction_10m": [],
        },
    }

    for key in time_keys:
        year = key[0:4]
        month = key[4:6]
        day = key[6:8]
        hour = key[8:10]
        out["hourly"]["time"].append(f"{year}-{month}-{day}T{hour}:00")

        def _clean(v: object) -> float | None:
            try:
                fv = float(v)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                return None
            return None if fv == -999.0 else fv

        out["hourly"]["shortwave_radiation"].append(_clean(ghi.get(key)))
        out["hourly"]["temperature_2m"].append(_clean(t2m.get(key)))
        out["hourly"]["wind_speed_10m"].append(_clean(ws10.get(key)))
        out["hourly"]["wind_direction_10m"].append(_clean(wd10.get(key)))

    output_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    return len(out["hourly"]["time"])


def download_open_meteo_with_validation(url: str, output_path: Path, attempts: int = 4) -> tuple[dict[str, object], int]:
    last_error: Exception | None = None
    for i in range(attempts):
        try:
            run_curl(url, output_path)
            points = _validate_open_meteo_payload(output_path)
            payload = json.loads(output_path.read_text(encoding="utf-8"))
            return payload, points
        except Exception as exc:
            last_error = exc
            if i < attempts - 1:
                time.sleep(3 * (i + 1))
                continue
            raise RuntimeError(str(last_error)) from last_error
    raise RuntimeError("unreachable")


def build_open_meteo_url(latitude: float, longitude: float, start_date: str, end_date: str) -> str:
    hourly = ",".join(OPEN_METEO_FIELDS)
    params = [
        "https://archive-api.open-meteo.com/v1/archive",
        f"latitude={latitude}",
        f"longitude={longitude}",
        f"start_date={start_date}",
        f"end_date={end_date}",
        f"hourly={hourly}",
        "timezone=UTC",
    ]
    return "?".join([params[0], "&".join(params[1:])])


def download_open_meteo_chunked(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
    output_path: Path,
) -> int:
    chunk_dir = output_path.parent / "_chunks"
    chunk_dir.mkdir(parents=True, exist_ok=True)

    payloads: list[dict[str, object]] = []
    total_points = 0

    for index, (chunk_start, chunk_end) in enumerate(build_year_chunks(start_date, end_date)):
        chunk_file = chunk_dir / f"{output_path.stem}_{chunk_start}_{chunk_end}.json"
        cached = _load_valid_cached_payload(chunk_file)
        if cached is not None:
            payload, points = cached
        else:
            url = build_open_meteo_url(latitude, longitude, chunk_start, chunk_end)
            payload, points = download_open_meteo_with_validation(url, chunk_file)
            if index < len(build_year_chunks(start_date, end_date)) - 1:
                time.sleep(OPEN_METEO_CHUNK_SLEEP_SECONDS)
        payloads.append(payload)
        total_points += points

    merged = merge_hourly_payloads(payloads)
    output_path.write_text(json.dumps(merged, indent=2), encoding="utf-8")
    _validate_open_meteo_payload(output_path)
    return total_points


def load_top_pvdaq_sites(limit: int = 5) -> list[dict[str, str]]:
    if not PVDAQ_SYSTEMS_CSV.exists():
        return []

    selected: list[dict[str, str]] = []
    with PVDAQ_SYSTEMS_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    def parse_float(raw: str) -> float:
        try:
            return float(raw)
        except Exception:
            return 0.0

    def parse_int(raw: str) -> int:
        try:
            return int(float(raw))
        except Exception:
            return 0

    rows = [
        r
        for r in rows
        if parse_float(r.get("years", "0")) >= 5.0 and r.get("qa_status", "").strip().lower() == "pass"
    ]
    rows.sort(key=lambda r: parse_int(r.get("number_records", "0")), reverse=True)

    by_id: dict[str, dict[str, str]] = {}
    for row in rows:
        sid = str(row.get("system_id", "")).strip()
        if sid and sid not in by_id:
            by_id[sid] = row

    ordered: list[dict[str, str]] = []
    for sid in PREFERRED_PVDAQ_SYSTEM_IDS:
        if sid in by_id:
            ordered.append(by_id[sid])

    if len(ordered) < limit:
        for row in rows:
            sid = str(row.get("system_id", "")).strip()
            if not sid:
                continue
            if sid in {str(r.get("system_id", "")).strip() for r in ordered}:
                continue
            ordered.append(row)
            if len(ordered) >= limit:
                break

    for row in ordered[:limit]:
        selected.append(
            {
                "system_id": row.get("system_id", ""),
                "system_public_name": row.get("system_public_name", ""),
                "latitude": row.get("latitude", ""),
                "longitude": row.get("longitude", ""),
                "timezone_or_utc_offset": row.get("timezone_or_utc_offset", ""),
                "years": row.get("years", ""),
                "number_records": row.get("number_records", ""),
                "available_sensor_channels": row.get("available_sensor_channels", ""),
                "dc_capacity_kW": row.get("dc_capacity_kW", ""),
                "qa_status": row.get("qa_status", ""),
                "qa_issue": row.get("qa_issue", ""),
            }
        )

    return selected


def download_pvdaq_metadata(system_id: str) -> dict[str, str]:
    base = "https://oedi-data-lake.s3.amazonaws.com"
    targets = {
        "metrics_parquet": f"pvdaq/parquet/metrics/metrics__system_{system_id}__part000.parquet",
        "system_5y_csv": f"pvdaq/csv/system/system_{system_id}__5y.csv",
    }
    output: dict[str, str] = {}

    for label, key in targets.items():
        out_path = SOLAR_DIR / "pvdaq" / f"system_{system_id}" / Path(key).name
        url = f"{base}/{key}"
        try:
            run_curl(url, out_path)
            output[label] = str(out_path.relative_to(ROOT)).replace("\\", "/")
        except subprocess.CalledProcessError:
            # Some optional objects are not guaranteed to exist in the bucket.
            continue

    return output


def main() -> None:
    start_date = "2021-01-01"
    end_date = "2025-12-31"

    solar_entries: list[dict[str, object]] = []
    wind_entries: list[dict[str, object]] = []

    for site in SOLAR_SITES:
        out_path = SOLAR_DIR / f"{site['site_id']}_open_meteo_2021_2025.json"
        source_name = "open-meteo-archive"
        try:
            point_count = download_open_meteo_chunked(
                site["latitude"],
                site["longitude"],
                start_date,
                end_date,
                out_path,
            )
        except RuntimeError as exc:
            if "Hourly API request limit exceeded" not in str(exc):
                raise
            point_count = download_nasa_power_as_hourly(
                site["latitude"],
                site["longitude"],
                start_date,
                end_date,
                out_path,
            )
            source_name = "nasa-power-hourly"

        solar_entries.append(
            {
                **site,
                "source": source_name,
                "timeseries_file": str(out_path.relative_to(ROOT)).replace("\\", "/"),
                "time_resolution": "hourly",
                "start_date": start_date,
                "end_date": end_date,
                "hourly_points": point_count,
                "field_count": len(OPEN_METEO_FIELDS),
                "fields": OPEN_METEO_FIELDS,
            }
        )

    for site in WIND_SITES:
        out_path = WIND_DIR / f"{site['site_id']}_open_meteo_2021_2025.json"
        source_name = "open-meteo-archive"
        try:
            point_count = download_open_meteo_chunked(
                site["latitude"],
                site["longitude"],
                start_date,
                end_date,
                out_path,
            )
        except RuntimeError as exc:
            if "Hourly API request limit exceeded" not in str(exc):
                raise
            point_count = download_nasa_power_as_hourly(
                site["latitude"],
                site["longitude"],
                start_date,
                end_date,
                out_path,
            )
            source_name = "nasa-power-hourly"

        wind_entries.append(
            {
                **site,
                "source": source_name,
                "timeseries_file": str(out_path.relative_to(ROOT)).replace("\\", "/"),
                "time_resolution": "hourly",
                "start_date": start_date,
                "end_date": end_date,
                "hourly_points": point_count,
                "field_count": len(OPEN_METEO_FIELDS),
                "fields": OPEN_METEO_FIELDS,
            }
        )

    pvdaq_top = load_top_pvdaq_sites(limit=5)
    for site in pvdaq_top:
        system_id = site.get("system_id", "")
        if not system_id:
            continue
        downloaded = download_pvdaq_metadata(system_id)
        site["downloaded_files"] = downloaded

    catalog = {
        "dataset": "dispatchlayer-production-demo",
        "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "coverage": {
            "start_date": start_date,
            "end_date": end_date,
            "years": 5,
            "time_resolution": "hourly",
        },
        "sources": [
            "open-meteo-archive",
            "nasa-power-hourly",
            "pvdaq-oedi-public-bucket",
        ],
        "solar_site_count": len(solar_entries),
        "wind_site_count": len(wind_entries),
        "solar_sites": solar_entries,
        "wind_sites": wind_entries,
        "pvdaq_top_systems": pvdaq_top,
    }

    CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CATALOG_PATH.write_text(json.dumps(catalog, indent=2), encoding="utf-8")

    print(f"Wrote catalog: {CATALOG_PATH}")
    print(f"Solar sites: {len(solar_entries)}")
    print(f"Wind sites: {len(wind_entries)}")
    print(f"PVDAQ systems tracked: {len(pvdaq_top)}")


if __name__ == "__main__":
    main()
