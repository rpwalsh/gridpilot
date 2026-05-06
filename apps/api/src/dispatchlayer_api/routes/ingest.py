# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone
import logging

from dispatchlayer_adapter_open_meteo.client import OpenMeteoClient
from dispatchlayer_domain.models import GeoPoint, ForecastWindow

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ingest"])


class WeatherIngestRequest(BaseModel):
    latitude: float
    longitude: float
    start_utc: datetime
    end_utc: datetime
    resolution_minutes: int = 60
    provider: str = "open_meteo"


@router.post("/ingest/weather")
async def ingest_weather(req: WeatherIngestRequest) -> dict:
    location = GeoPoint(latitude=req.latitude, longitude=req.longitude)
    window = ForecastWindow(start_utc=req.start_utc, end_utc=req.end_utc, resolution_minutes=req.resolution_minutes)

    if req.provider == "open_meteo":
        client = OpenMeteoClient()
        forecast = await client.get_forecast(location, window)
        return {
            "source": forecast.source,
            "sample_count": len(forecast.samples),
            "samples": [
                {
                    "timestamp_utc": s.timestamp_utc.isoformat(),
                    "temperature_c": s.temperature_c,
                    "wind_speed_mps": s.wind_speed_mps,
                    "shortwave_radiation_wm2": s.shortwave_radiation_wm2,
                }
                for s in forecast.samples
            ],
        }
    return {"error": f"Unknown provider: {req.provider}", "samples": []}
