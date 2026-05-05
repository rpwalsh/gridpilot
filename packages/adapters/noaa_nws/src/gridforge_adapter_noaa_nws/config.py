from pydantic_settings import BaseSettings


class NoaaNwsConfig(BaseSettings):
    model_config = {"env_prefix": "NOAA_NWS_"}

    base_url: str = "https://api.weather.gov"
    timeout_seconds: int = 20
    retries: int = 3
    enabled: bool = True
    user_agent: str = "GridForge/0.1.0 (gridforge-ops)"
