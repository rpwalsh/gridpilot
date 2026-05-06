# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from typing import Optional
from pydantic_settings import BaseSettings


class EntsoeConfig(BaseSettings):
    model_config = {"env_prefix": "ENTSOE_"}

    api_key: Optional[str] = None
    base_url: str = "https://web-api.tp.entsoe.eu/api"
    timeout_seconds: int = 30
    retries: int = 3
