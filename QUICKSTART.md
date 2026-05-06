# DispatchLayer — Quickstart

Three ways to run DispatchLayer: Docker Compose (recommended), local Python + Node, or API-only.

---

## Option 1: Docker Compose (full stack)

**Prerequisites:** Docker 24+, Docker Compose v2

```bash
git clone https://github.com/rpwalsh/dispatchlayer.git
cd dispatchlayer
cp .env.example .env          # edit to add optional API keys (NREL, EIA, ENTSO-E)
docker compose up --build
```

| Service   | URL                          |
|-----------|------------------------------|
| Dashboard | http://localhost:3000        |
| API       | http://localhost:8000        |
| API docs  | http://localhost:8000/docs   |

---

## Option 2: Local development

**Prerequisites:** Python 3.11+, Node 20+

### Backend

```bash
cd dispatchlayer
cp .env.example .env

# Install all packages in editable mode
pip install \
  -e packages/domain \
  -e packages/predictive \
  -e packages/forecasting \
  -e packages/anomaly \
  -e packages/dispatch \
  -e packages/adapters/open_meteo \
  -e packages/adapters/noaa_nws \
  -e packages/adapters/nasa_power \
  -e packages/adapters/nrel \
  -e packages/adapters/eia \
  -e packages/adapters/entsoe \
  -e apps/api

uvicorn dispatchlayer_api.main:app --reload --port 8000
```

API is now running at http://localhost:8000. Interactive docs at http://localhost:8000/docs.

### Frontend

```bash
cd apps/dashboard
npm install
npm run dev         # proxies /api/* to localhost:8000 automatically
```

Dashboard is now running at http://localhost:3000.

---

## Option 3: API only (no frontend)

```bash
pip install -e packages/domain -e packages/predictive -e packages/forecasting \
    -e packages/anomaly -e packages/dispatch \
    -e packages/adapters/open_meteo -e packages/adapters/noaa_nws \
    -e packages/adapters/nasa_power -e packages/adapters/nrel \
    -e packages/adapters/eia -e packages/adapters/entsoe -e apps/api

uvicorn dispatchlayer_api.main:app --port 8000
```

---

## First API call

Verify the service is running:

```bash
curl http://localhost:8000/health
# {"status":"ok","service":"dispatchlayer-api","version":"0.1.0"}
```

Run the full L→G→P site evaluation pipeline:

```bash
curl -s -X POST http://localhost:8000/api/v1/sites/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo_solar_site",
    "latitude": 44.9537,
    "longitude": -93.09,
    "asset_type": "solar",
    "capacity_mw": 50.0,
    "window_hours": 24,
    "ghi_wm2": 650.0,
    "temperature_c": 22.0,
    "grid_demand_mw": 28000.0,
    "forecast_residual_pct": -8.5,
    "current_soc_pct": 72.0,
    "price_per_mwh": 55.0
  }' | python3 -m json.tool
```

The response includes `p10_mwh`, `p50_mwh`, `p90_mwh`, `forecast_trust_score`,
`error_decomposition`, `structural_drift`, and a full `audit_trace`.

---

## Source snapshots

The Back-Test page renders from cached source snapshots, not live API calls.

To capture a real weather snapshot for the Back-Test view:

```bash
python scripts/capture_weather_snapshot.py \
  --lat 31.97 \
  --lon -102.08 \
  --start 2000-01-01 \
  --end 2024-12-31 \
  --out data/source_snapshots/weather/open_meteo_west_texas_2000_2024.json
```

See `data/source_snapshots/weather/README.md` for the snapshot format.

---

## Environment variables

| Variable                             | Default    | Description                                         |
|--------------------------------------|------------|-----------------------------------------------------|
| `DISPATCHLAYER_ENV`                  | `local`    | Environment name                                    |
| `OPEN_METEO_ENABLED`                 | `true`     | Enable Open-Meteo weather adapter (no key required) |
| `NOAA_NWS_ENABLED`                   | `true`     | Enable NOAA NWS adapter (no key required)           |
| `NASA_POWER_ENABLED`                 | `true`     | Enable NASA POWER adapter (no key required)         |
| `NREL_API_KEY`                       | —          | NREL API key (optional; free at developer.nrel.gov) |
| `EIA_API_KEY`                        | —          | EIA API key (optional; free at eia.gov)             |
| `ENTSOE_API_KEY`                     | —          | ENTSO-E API key (optional; for European grid data)  |
| `DISPATCHLAYER_HTTP_TIMEOUT_SECONDS` | `20`       | HTTP timeout for provider calls                     |
| `DISPATCHLAYER_HTTP_RETRIES`         | `3`        | Retry count for provider calls                      |
| `DISPATCHLAYER_CACHE_BACKEND`        | `sqlite`   | Cache backend (`sqlite` or `none`)                  |

---

## Running tests

```bash
make install
make test
```

Or manually:

```bash
PYTHONPATH=packages/domain/src:packages/predictive/src:packages/forecasting/src:packages/anomaly/src:packages/dispatch/src:packages/signals/src:packages/simulation/src:packages/adapters/open_meteo/src:packages/adapters/noaa_nws/src:packages/adapters/nasa_power/src:packages/adapters/nrel/src:packages/adapters/eia/src:packages/adapters/entsoe/src:packages/connectors/opentelemetry/src:packages/connectors/opcua/src:packages/connectors/mqtt/src:packages/connectors/sitewise/src:packages/connectors/parquet/src:apps/api/src \
  python3 -m pytest --import-mode=importlib -q
```

---

## Stack summary

| Layer       | Technology                                   |
|-------------|----------------------------------------------|
| Frontend    | React 18 + TypeScript + Vite + Recharts      |
| API         | FastAPI + Uvicorn + Pydantic v2              |
| Core logic  | Pure Python 3.11 (no ML runtime dependency)  |
| Adapters    | httpx, async/await, SQLite cache             |
| Container   | Docker + Nginx (dashboard), Python slim (API)|
| Deployment  | docker compose up --build                    |
