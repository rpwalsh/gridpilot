# GridForge

**GridForge** is a renewable-energy operations intelligence platform by Walsh. It provides deterministic, evidence-weighted reasoning for wind and solar portfolio operations.

## Architecture

- **Walsh Predictive Core** (`walsh-predictive-core`): Signal state, evidence graphs, causal attribution, forecast bounds, decision traces
- **Domain** (`gridforge-domain`): Shared domain models and provider protocols
- **Adapters**: Open-Meteo, NOAA/NWS, NASA POWER, NREL, EIA, ENTSO-E
- **Forecasting** (`gridforge-forecasting`): Wind power curves, solar irradiance models, portfolio aggregation
- **Anomaly** (`gridforge-anomaly`): Real-time anomaly detection with causal attribution
- **Dispatch** (`gridforge-dispatch`): Battery dispatch optimizer
- **Recommendations** (`gridforge-recommendations`): Evidence-ranked operational recommendations
- **API** (`gridforge-api`): FastAPI REST service — all endpoints under `/api/v1/`
- **Dashboard**: React + Vite + TypeScript operations dashboard

## Quick Start

```bash
cp .env.example .env
pip install -e packages/domain -e packages/walsh-predictive-core -e packages/forecasting \
    -e packages/anomaly -e packages/dispatch -e packages/recommendations \
    -e packages/adapters/open_meteo -e packages/adapters/noaa_nws \
    -e packages/adapters/nasa_power -e packages/adapters/nrel \
    -e packages/adapters/eia -e packages/adapters/entsoe \
    -e apps/api
uvicorn gridforge_api.main:app --reload
```

## API

Base path: `/api/v1/`

Key endpoint groups:
- `/api/v1/providers` — provider health
- `/api/v1/forecasts` — generation forecasts
- `/api/v1/anomalies` — anomaly detection
- `/api/v1/recommendations` — operational recommendations
- `/api/v1/dispatch` — battery dispatch
- `/api/v1/predictive` — Walsh Predictive Core direct access
- `/api/v1/audit` — decision trace audit

## License

Copyright Walsh. All rights reserved.
