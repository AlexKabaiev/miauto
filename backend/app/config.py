"""Application configuration using pydantic-settings."""

import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings.

    Defaults are suitable for development. In production the SQLite DB
    is stored in %APPDATA%/MIAUTO/.
    """

    APP_NAME: str = "MIAUTO"
    APP_VERSION: str = "1.0.0"

    # --- Database -----------------------------------------------------------
    DB_DIR: Path = Path(__file__).resolve().parent.parent / "data"
    DB_NAME: str = "miauto.db"

    @property
    def database_url(self) -> str:
        self.DB_DIR.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{self.DB_DIR / self.DB_NAME}"

    # --- Server --------------------------------------------------------------
    HOST: str = "127.0.0.1"
    PORT: int = 8421

    # --- Currency API --------------------------------------------------------
    MONOBANK_API_URL: str = "https://api.monobank.ua/bank/currency"
    CURRENCY_CACHE_TTL: int = 300  # seconds

    # --- CSV Import ----------------------------------------------------------
    CSV_DIR: Path = Path(__file__).resolve().parent.parent.parent / "docs" / "export_orders" / "coverted_new"

    model_config = {"env_prefix": "MIAUTO_"}


settings = Settings()
