from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://biodiversity:biodiversity@db:5432/biodiversity_db"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    # External providers
    iucn_api_token: str = ""

    # Files produced by the app
    exports_dir: str = "./exports"
    # None -> <backend>/app/graphics (resolved in graphics_service)
    graphics_dir: str | None = None
    graphics_cache_dir: str | None = None
    graphics_dpi: str = "200"
    graphics_max_rss_mb: int = 350
    graphics_max_concurrent: int = 1

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
