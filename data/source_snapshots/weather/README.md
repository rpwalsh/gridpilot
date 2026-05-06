# Weather Source Snapshots

This directory contains cached source snapshots from real weather provider APIs.

Source snapshots are used by the Back-Test page to render deterministic, reproducible
proof views without requiring live API access during review.

## Why source snapshots, not mock data

The data in this directory came from real provider APIs. It is not invented.

Using a cached snapshot means:
- The page renders identically on every load
- No external API is called from the browser
- No API rate limits are hit during review
- The data provenance is traceable to a real source

## Snapshot format

Every snapshot must include source metadata, query parameters, capture time,
schema version, record count, and a SHA-256 hash of the record content.

```json
{
  "dataset_id": "open_meteo_west_texas_monthly_2000_2024",
  "schema_version": "dispatchlayer.proof.weather.v1",
  "source_record": {
    "provider": "Open-Meteo Archive API",
    "source_type": "weather_api_snapshot",
    "station_label": "West Texas (Midland area)",
    "latitude": 31.97,
    "longitude": -102.08,
    "captured_at_utc": "2026-05-05T00:00:00Z",
    "source_url": "https://archive-api.open-meteo.com/v1/archive",
    "license_or_terms": "Open-Meteo data is licensed under CC BY 4.0 for non-commercial use",
    "query": {
      "start": "2000-01-01",
      "end": "2024-12-31",
      "daily": ["shortwave_radiation_sum", "wind_speed_10m_max", "temperature_2m_mean"],
      "aggregation": "monthly_mean"
    }
  },
  "windows": {
    "training": {
      "start_utc": "2000-01-01T00:00:00Z",
      "end_utc": "2023-12-31T23:59:59Z"
    },
    "holdout": {
      "start_utc": "2024-01-01T00:00:00Z",
      "end_utc": "2024-12-31T23:59:59Z"
    }
  },
  "integrity": {
    "record_count": 300,
    "missing_count": 0,
    "content_sha256": ""
  },
  "series": [
    {
      "timestamp_utc": "2000-01-01T00:00:00Z",
      "year": 2000,
      "month": 1,
      "shortwave_radiation_sum_mjm2": 12.4,
      "wind_speed_10m_max_ms": 8.1,
      "temperature_2m_mean_c": 7.3,
      "quality": "GOOD"
    }
  ]
}
```

## Capturing a snapshot

Run the capture script to fetch real data from Open-Meteo Archive API:

```bash
python scripts/capture_weather_snapshot.py \
  --lat 31.97 \
  --lon -102.08 \
  --start 2000-01-01 \
  --end 2024-12-31 \
  --out data/source_snapshots/weather/open_meteo_west_texas_monthly_2000_2024.json
```

The script requires network access to `archive-api.open-meteo.com` (no API key needed).

If the API is unavailable, the script exits with:

```
SOURCE_CAPTURE_STATE: FAILED
REASON: API_UNAVAILABLE
```

It does not generate placeholder data.

## License note

Open-Meteo data is available under CC BY 4.0 for non-commercial use.
See: https://open-meteo.com/en/license

For commercial use, see Open-Meteo commercial plans.
