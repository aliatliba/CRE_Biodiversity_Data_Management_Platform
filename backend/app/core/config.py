"""Central application configuration.

All settings are read from environment variables (or a local .env file during
development). Nothing here should ever contain a hardcoded secret.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    app_name: str = "Biodiversity Data Entry Platform"
    environment: str = "development"
    debug: bool = False

    # --- Database ---
    database_url: str = "postgresql+psycopg://biodiv_admin:changeme@db:5432/biodiversity_db"

    # --- Security / JWT ---
    jwt_secret_key: str = "iWMwj3BLBsuc9VTXikQinVeRB6sw6jiK5HdF"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # --- CORS ---
    cors_allowed_origins: list[str] = ["http://localhost:5173"]

    # --- External providers ---
    iucn_api_token: str | None = None
    external_api_timeout_seconds: float = 5.0


@lru_cache
def get_settings() -> Settings:
    """Settings are cached so the environment is only parsed once per process."""
    return Settings()


settings = get_settings()
