from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import providers, ingest, forecasts, anomalies, signals, connectors, dispatch, audit, predictive, sites, telemetry

app = FastAPI(
    title="DispatchLayer API",
    description="DispatchLayer: utility-grade instrumentation console for SCADA telemetry, forecast envelopes, residual fields, spectral transforms, temporal playback, source integrity, and audit metadata.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_prefix = "/api/v1"

app.include_router(providers.router, prefix=_prefix)
app.include_router(ingest.router, prefix=_prefix)
app.include_router(sites.router, prefix=_prefix)
app.include_router(telemetry.router, prefix=_prefix)
app.include_router(forecasts.router, prefix=_prefix)
app.include_router(anomalies.router, prefix=_prefix)
app.include_router(signals.router, prefix=_prefix)
app.include_router(connectors.router, prefix=_prefix)
app.include_router(dispatch.router, prefix=_prefix)
app.include_router(audit.router, prefix=_prefix)
app.include_router(predictive.router, prefix=_prefix)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "dispatchlayer-api", "version": "0.1.0"}


@app.get("/api/v1/health")
async def api_health() -> dict:
    return {"status": "ok", "service": "dispatchlayer-api", "version": "0.1.0"}
