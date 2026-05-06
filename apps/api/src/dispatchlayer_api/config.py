# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from typing import Optional
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DISPATCHLAYER_",
        extra="ignore",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    open_meteo_enabled: bool = True
    noaa_nws_enabled: bool = True
    nasa_power_enabled: bool = True
    nrel_api_key: Optional[str] = None
    eia_api_key: Optional[str] = None
    entsoe_api_key: Optional[str] = None
    http_timeout_seconds: int = 20
    http_retries: int = 3


@lru_cache
def get_settings() -> Settings:
    return Settings()
