from typing import Optional
from pydantic_settings import BaseSettings


class NrelConfig(BaseSettings):
    model_config = {"env_prefix": "NREL_"}

    api_key: Optional[str] = None
    base_url: str = "https://developer.nrel.gov/api/pvwatts/v8.json"
    timeout_seconds: int = 20
    retries: int = 3
