# DispatchLayer

DispatchLayer is a production-oriented renewable operations intelligence platform.

It converts real public weather, solar-resource, and grid data into normalized domain models, forecast outputs, operational recommendations, and auditable decision traces.

The project is built around production engineering concerns: typed provider adapters, caching, retries, source attribution, data-quality scoring, deterministic predictive logic, FastAPI service boundaries, and a clean full-stack dashboard.

DispatchLayer does not depend on fabricated business data at runtime. The application uses live public data adapters where available. Synthetic fixtures are used only for deterministic testing, offline CI, and fault-injection simulation.

---

## Why this matters

Renewable operators do not simply need dashboards. They need systems that turn weather, telemetry, grid constraints, and asset behavior into timely operational decisions.

DispatchLayer demonstrates that flow end to end:

```
weather + telemetry + grid context
  → normalized signals
  → portfolio structural state
  → forecasted operational evolution
  → ranked operating recommendations with audit traces
```

---

## Predictive Operations Core

DispatchLayer includes a deterministic predictive operations core for converting renewable-energy time-series data into auditable operational recommendations.

The core uses a four-layer operator architecture:

1. **L — Local Signal Scoring**
   Scores typed interactions between assets, weather conditions, grid state, and market signals over time. Each interaction type has its own decay rate so that a 2-hour-old weather observation and a 12-hour-old market price age at operationally appropriate rates.

2. **G — Structural Summarization**
   Compresses local signal scores into site-level and portfolio-level structural state. This is the layer that prevents external provider shapes from leaking into the predictive or decision layers.

3. **P — Predictive Evolution**
   Forecasts how the structural state evolves across the operating window. Produces p10/p50/p90 bounds and an explicit three-term error decomposition:
   - **ε_G** (structural): how well the state model represents reality
   - **ε_P** (predictive): model extrapolation error over the horizon
   - **ε_obs** (observational): irreducible measurement noise floor

4. **D — Decision Ranking**
   Produces ranked recommendations with evidence, confidence, urgency, and estimated business impact. Every recommendation includes an audit trace showing which signals, rules, and model versions drove the output.

This allows DispatchLayer to move beyond dashboarding: the system converts weather and telemetry into reproducible operating decisions, not charts.

### Forecast trust score

Instead of a single opaque confidence number, DispatchLayer exposes the three-term decomposition to operators:

```json
{
  "forecast_trust_score": 0.81,
  "error_decomposition": {
    "structural_error": { "score": 0.08, "meaning": "site model has adequate asset/weather mapping" },
    "predictive_error": { "score": 0.07, "meaning": "forecast horizon is within calibrated range" },
    "observational_noise": { "score": 0.04, "meaning": "source data is fresh and mostly complete" }
  },
  "dominant_term": "structural",
  "warnings": []
}
```

### Structural drift detection

DispatchLayer tracks whether the relationship between input signals and output measurements has shifted from the recent baseline. When residuals diverge, it warns operators before the bias compounds across a full dispatch window.

### Root-cause ranking

When underperformance is detected, the predictive core ranks likely causes rather than reporting a single answer:

```json
{
  "root_cause_ranking": [
    { "cause": "cloud_cover_forecast_error", "confidence": 0.67 },
    { "cause": "inverter_derating", "confidence": 0.41 }
  ],
  "recommended_action": "Reconcile solar forecast with observed irradiance before escalating maintenance."
}
```

---

## Data Sources

DispatchLayer uses real public APIs by default.

| Domain | Provider | Cost | Auth | Adapter |
|---|---|---|---|---|
| Weather forecast | Open-Meteo | Free for non-commercial use | No key | `open_meteo` |
| U.S. weather | NOAA/NWS | Public | No key | `noaa_nws` |
| Solar / climate resource | NASA POWER | Free | No key | `nasa_power` |
| Renewable modeling | NREL Developer Network | Free with key | API key | `nrel` |
| U.S. electricity data | EIA Open Data | Free with key | API key | `eia` |
| European electricity data | ENTSO-E Transparency Platform | Free with registration | API token | `entsoe` |

---

## Architecture

```
Weather Forecasts
SCADA / Telemetry
Market Prices
Grid Constraints
        ↓
Adapter layer (typed domain models — no provider JSON in core)
        ↓
L — Local Signal Scoring (typed temporal decay per interaction type)
        ↓
G — Structural Summarization (site and portfolio state)
        ↓
P — Predictive Evolution (p10/p50/p90 + three-term error decomposition)
        ↓
D — Decision Ranking (evidence-backed, scored, auditable)
        ↓
API + Dashboard + Audit Trail
```

### Platform layers

```
DispatchLayer Platform
   DispatchLayer API          (apps/api)
   DispatchLayer Operations Engine
        forecasting
        anomaly
        dispatch
        recommendations
   Predictive Operations Core   (packages/predictive)
         L: LocalSignalScorer
         G: PortfolioStateBuilder
         P: PredictiveEvolutionEngine
         D: DecisionRanker
```

---

## Quick start

```bash
cp .env.example .env
pip install -e packages/domain -e packages/predictive -e packages/forecasting \
    -e packages/anomaly -e packages/dispatch -e packages/recommendations \
    -e packages/adapters/open_meteo -e packages/adapters/noaa_nws \
    -e packages/adapters/nasa_power -e packages/adapters/nrel \
    -e packages/adapters/eia -e packages/adapters/entsoe \
    -e apps/api
uvicorn dispatchlayer_api.main:app --reload
# API docs: http://localhost:8000/docs
```

Dashboard (requires Node 18+):

```bash
cd apps/dashboard && npm install && npm run dev
# Dashboard: http://localhost:3000
```

Or run everything with Docker Compose:

```bash
docker compose up
```

---

## API

Base path: `/api/v1/`

| Group | Endpoints |
|---|---|
| Providers | `GET /providers`, `GET /providers/health` |
| Ingest | `POST /ingest/weather/open-meteo`, `/ingest/solar/nasa-power`, `/ingest/grid/eia`, ... |
| Forecasts | `POST /forecast/site`, `POST /forecast/portfolio` |
| Anomalies | `POST /anomalies/detect`, `GET /anomalies` |
| Recommendations | `POST /recommendations`, `GET /recommendations` |
| Dispatch | `POST /dispatch` |
| Predictive core | `POST /predictive/inference`, `/predictive/score`, `/predictive/evolve`, `/predictive/rank`, `/predictive/explain` |
| Audit | `GET /audit/{decision_id}` |

---

## AWS deployment path

- S3 for raw telemetry and forecast files
- Lambda or ECS for ingestion jobs
- Timestream or Aurora/Postgres for normalized time-series data
- SageMaker-compatible model interfaces
- API Gateway + ECS/Fargate for serving
- CloudWatch for operational monitoring
- EventBridge for scheduled forecast jobs
