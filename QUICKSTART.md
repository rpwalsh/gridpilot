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

## 1) Start API

From repo root:

```powershell
$env:PYTHONPATH = "c:\Users\react\DispatchLayer"
c:/python314/python.exe -m uvicorn apps.api.src.dispatchlayer_api.main:app --port 8000
```

Health check:

```powershell
Invoke-WebRequest "http://127.0.0.1:8000/api/v1/health" -UseBasicParsing
```

## 2) Start Dashboard

From apps/dashboard:

```powershell
npm install
npm run dev
```

Dashboard should run at http://localhost:3000.

## 3) Validate API Capacity

Verify 5-year window support:

```powershell
Invoke-WebRequest "http://127.0.0.1:8000/api/v1/timeseries/solar_albuquerque_1?hours=43800" -UseBasicParsing
Invoke-WebRequest "http://127.0.0.1:8000/api/v1/sites/solar_albuquerque_1/pipeline?history_hours=43800&horizon_hours=168" -UseBasicParsing
```

Both should return HTTP 200.

## 4) Validate Forecast Page

Open http://localhost:3000/forecast and confirm:

1. History selector is set to 5 y
2. Training window displays 2021-2024
3. Holdout year displays 2025
4. Holdout bar label shows +/-6%
5. Forecast Bands includes:
   - input state variable table
   - forecast output table (P10/P50/P90)
   - identified spectral signals table

## Common Issues

- If requests go to port 8001, check dashboard env vars and restart Vite.
- If forecast panels are empty, confirm API is running on 8000.
- If holdout says no months found, verify history window and source data availability.

