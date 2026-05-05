from pydantic_settings import BaseSettings


class OpenMeteoConfig(BaseSettings):
    model_config = {"env_prefix": "OPEN_METEO_"}

    base_url: str = "https://api.open-meteo.com/v1/forecast"
    timeout_seconds: int = 20
    retries: int = 3
    enabled: bool = True
