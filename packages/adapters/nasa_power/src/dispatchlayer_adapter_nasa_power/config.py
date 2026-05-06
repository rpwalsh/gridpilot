from pydantic_settings import BaseSettings


class NasaPowerConfig(BaseSettings):
    model_config = {"env_prefix": "NASA_POWER_"}

    base_url: str = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    timeout_seconds: int = 30
    retries: int = 3
    enabled: bool = True
