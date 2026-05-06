# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

from typing import Optional
from pydantic_settings import BaseSettings


class EiaConfig(BaseSettings):
    model_config = {"env_prefix": "EIA_"}

    api_key: Optional[str] = None
    base_url: str = "https://api.eia.gov/v2"
    timeout_seconds: int = 20
    retries: int = 3
