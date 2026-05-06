from fastapi import APIRouter
from pydantic import BaseModel
from ..config import get_settings

router = APIRouter(tags=["providers"])


class ProviderStatus(BaseModel):
    name: str
    enabled: bool
    requires_key: bool
    key_configured: bool


class ProvidersResponse(BaseModel):
    providers: list[ProviderStatus]


@router.get("/providers", response_model=ProvidersResponse)
async def list_providers() -> ProvidersResponse:
    settings = get_settings()
    return ProvidersResponse(providers=[
        ProviderStatus(name="open_meteo", enabled=settings.open_meteo_enabled, requires_key=False, key_configured=True),
        ProviderStatus(name="noaa_nws", enabled=settings.noaa_nws_enabled, requires_key=False, key_configured=True),
        ProviderStatus(name="nasa_power", enabled=settings.nasa_power_enabled, requires_key=False, key_configured=True),
        ProviderStatus(name="nrel", enabled=True, requires_key=True, key_configured=bool(settings.nrel_api_key)),
        ProviderStatus(name="eia", enabled=True, requires_key=True, key_configured=bool(settings.eia_api_key)),
        ProviderStatus(name="entsoe", enabled=True, requires_key=True, key_configured=bool(settings.entsoe_api_key)),
    ])


@router.get("/providers/health")
async def providers_health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "providers": {
            "open_meteo": "enabled" if settings.open_meteo_enabled else "disabled",
            "noaa_nws": "enabled" if settings.noaa_nws_enabled else "disabled",
            "nasa_power": "enabled" if settings.nasa_power_enabled else "disabled",
            "nrel": "configured" if settings.nrel_api_key else "unconfigured",
            "eia": "configured" if settings.eia_api_key else "unconfigured",
            "entsoe": "configured" if settings.entsoe_api_key else "unconfigured",
        }
    }
