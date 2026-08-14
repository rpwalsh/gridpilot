# Quickstart

This quickstart brings up the API and dashboard with the aligned forecast workflow:

- 5-year history window (43800h)
- Holdout year forced to 2025
- Training years 2021-2024
- Holdout hit threshold set to 6%

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm
- make (optional but recommended — wraps all common commands)

## 1) Install all packages

From repo root:

```bash
make install
```

This installs all Python packages in editable mode and runs `npm install` in
`apps/dashboard`.

## 2) Start API

```bash
make api
```

This runs:

```bash
uvicorn dispatchlayer_api.main:app --reload --port 8000
```

The API must be launched from the repo root with the repo root on
`PYTHONPATH`. The `make` target handles this automatically. To run manually:

```bash
# Linux / macOS
PYTHONPATH=$(pwd) uvicorn apps.api.src.dispatchlayer_api.main:app --port 8000

# Windows PowerShell
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn apps.api.src.dispatchlayer_api.main:app --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/v1/health
```

## 3) Start Dashboard

```bash
make dashboard
```

Or manually from `apps/dashboard`:

```bash
npm run dev
```

Dashboard runs at http://localhost:3000.

## 4) Validate API Capacity

Verify 5-year window support:

```bash
curl "http://localhost:8000/api/v1/timeseries/solar_albuquerque_1?hours=43800"
curl "http://localhost:8000/api/v1/sites/solar_albuquerque_1/pipeline?history_hours=43800&horizon_hours=168"
```

Both should return HTTP 200.

## 5) Validate Forecast Page

Open http://localhost:3000/forecast and confirm:

1. History selector is set to 5 y
2. Training window displays 2021-2024
3. Holdout year displays 2025
4. Holdout bar label shows +/-6%
5. Forecast Bands includes:
   - input state variable table
   - forecast output table (P10/P50/P90)
   - identified spectral signals table

## Full Verification Suite

```bash
make verify
```

Runs all Python tests, the language-boundary lint check, and a frontend build.

## Common Issues

- If requests go to port 8001, check dashboard env vars and restart Vite.
- If forecast panels are empty, confirm API is running on 8000.
- If holdout says no months found, verify history window and source data availability.
- If Python packages are not found, confirm you installed from the repo root (`make install` or `pip install -e packages/... apps/api`).

