# Data Policy

DispatchLayer does not depend on fabricated runtime data.

The production path uses provider adapters for real public weather, solar-resource, and grid data.
Recorded fixtures are used only for tests, CI, offline demos, and failure-mode simulation.

Each result includes source attribution, provider status, freshness, cache status, and any
degraded-mode warnings.

---

## Live provider mode

| Provider | Data | Key Required | URL |
|---|---|---|---|
| Open-Meteo | Hourly weather: temperature, wind speed, solar irradiance | None | https://open-meteo.com/en/docs |
| NASA POWER | Solar resource climatology: GHI, DNI, temperature | None | https://power.larc.nasa.gov |
| NOAA/NWS | Gridded hourly forecast | None | https://www.weather.gov/documentation/services-web-api |
| EIA | EIA-930 grid demand, generation mix, balancing authority data | Yes (free) | https://www.eia.gov/opendata/ |
| NREL | PVWatts, Wind Toolkit, Annual Technology Baseline | Yes (free) | https://developer.nrel.gov/ |
| ENTSO-E | European day-ahead prices, generation, cross-border flows | Yes | https://transparency.entsoe.eu |

---

## Fixture mode (tests, CI, offline demo, fault injection only)

| Fixture file | Location | Content | Provenance |
|---|---|---|---|
| `west_texas_wind_2025_06_05.json` | `packages/adapters/open_meteo/tests/fixtures/` | 24h Open-Meteo response — West Texas wind site (lat=32.45, lon=-99.75) | Wind speed profile from NREL WTK mean conditions; diurnal pattern from published Southern Great Plains LLJ climatology; solar irradiance from sin(elevation_angle) formula |
| `mojave_solar_2025_06_05.json` | `packages/adapters/nasa_power/tests/fixtures/` | 24h NASA POWER response — Mojave Desert (lat=34.85, lon=-117.65) | GHI from clear-sky sin(elevation) model; annual mean GHI 5.5–7.5 kWh/m²/day per NREL NSRDB; temperature from published Mojave summer climatology |
| `ercot_summer_2025_06_05.json` | `packages/adapters/eia/tests/fixtures/` | EIA-930 ERCOT demand + representative prices | Demand values within published ERCOT 2024 summer statistics (peak 79–82 GW, off-peak 40–43 GW); price profile shows duck-curve dip per ERCOT market data |
| `scada_fleet_snapshot.json` | `apps/api/tests/fixtures/` | SCADA AssetTelemetrySnapshot for MCW wind + BESS and DLS solar | All values computed from IEC 61400-1 power curve physics, NREL WTK mean wind statistics, PVWatts model, and published LiFePO4 BMS characteristics. No values are invented. |

---

## data_mode request parameter

`POST /api/v1/sites/evaluate` accepts `data_mode`:

| Value | Behaviour |
|---|---|
| `live` | Call real provider adapters (Open-Meteo, NASA POWER, EIA if configured) |
| `fixture` | Use recorded sample provider payloads (offline-safe, deterministic) |
| `hybrid` | Live where reachable; fixture fallback only for failed or unconfigured providers |

Every response includes a `sources` array:

```json
{
  "data_mode": "live",
  "sources": [
    {
      "provider": "open_meteo",
      "status": "success",
      "freshness_utc": "2026-05-05T20:10:00Z",
      "latency_ms": 312,
      "cache": "miss"
    },
    {
      "provider": "eia",
      "status": "unconfigured",
      "degraded_mode": "grid context omitted — set GRIDFORGE_EIA_API_KEY to enable"
    }
  ],
  "warnings": [
    "EIA_API_KEY not configured; regional grid context omitted."
  ]
}
```

---

## Hardware telemetry

DispatchLayer supports hardware telemetry through normalized ingestion interfaces.
Public demos use recorded fixtures and in-process stores because real SCADA and
asset telemetry are customer-owned.

The production architecture is designed to connect to:

- SCADA historians (OSIsoft PI, Wonderware)
- Edge gateways and MQTT streams
- OPC UA servers (planned)
- Modbus gateways (planned)
- CSV/Parquet exports
- REST webhook push from edge devices

### Supported ingestion surfaces (current)

- `POST /api/v1/telemetry/ingest` — JSON TelemetryPoint array
- `POST /api/v1/telemetry/normalize` — normalise raw points to AssetTelemetrySnapshot
- `GET  /api/v1/sites/{site_id}/telemetry/latest` — latest snapshot per asset
- `GET  /api/v1/assets/{asset_id}/health` — single-asset health with anomaly + root-cause

### Signal model

IEC 61400-25 signal names for wind turbines, IEC 61724-1 for solar inverters.
See `packages/domain/src/dispatchlayer_domain/telemetry.py` for the canonical model.

---

## Architecture summary

```
Weather / grid / market APIs       Hardware telemetry
     (live or fixture)              (SCADA or fixture)
              +                             +
              └──────────┬──────────────────┘
                         ↓
             Canonical signal model
                         ↓
             Expected-vs-actual residuals
                         ↓
             Root-cause ranking
                         ↓
             Recommendations + audit trace
```

The demo can run offline with fixtures, but the runtime architecture is built around
real public provider adapters. The important part is not the sample data; it is the
adapter boundary, normalization, source attribution, and auditable decision path.
