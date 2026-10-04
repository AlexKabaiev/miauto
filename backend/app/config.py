"""Application configuration using pydantic-settings."""

import os
from pathlib import Path
import sys

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings.

    Defaults are suitable for development. In production the SQLite DB
    is stored in %APPDATA%/MIAUTO/.
    """

    APP_NAME: str = "MIAUTO"
    APP_VERSION: str = "1.0.0"

    # --- Database -----------------------------------------------------------
    @property
    def DB_DIR(self) -> Path:
        if getattr(sys, 'frozen', False):
            exe_dir = Path(sys.executable).parent
            return exe_dir / "data"
        return Path(__file__).resolve().parent.parent / "data"

    DB_NAME: str = "miauto.db"

    @property
    def database_url(self) -> str:
        db_dir = self.DB_DIR
        db_dir.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{db_dir / self.DB_NAME}"

    @property
    def BACKUP_DIR(self) -> Path:
        if getattr(sys, 'frozen', False):
            exe_dir = Path(sys.executable).parent
            return exe_dir / "backups"
        return Path(__file__).resolve().parent.parent.parent / "backups"

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
