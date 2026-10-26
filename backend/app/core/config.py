from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Placeholder secrets that must never sign tokens outside development / tests.
_WEAK_JWT_SECRETS = {"", "change-me", "change-me-in-production", "secret"}
_MIN_JWT_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://biodiversity:biodiversity@db:5432/biodiversity_db"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    environment: str = "development"
    # Never on by default: Starlette's debug mode sends tracebacks to the client.
    debug: bool = False
    # Swagger / ReDoc / openapi.json. None -> enabled everywhere except production.
    api_docs_enabled: bool | None = None
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    # First admin account, created only when no user has that email yet. Without a
    # password a random one is generated and written to the log once; either way the
    # admin must replace it on first sign-in.
    initial_admin_email: str = "admin@biodiversity.local"
    initial_admin_password: str | None = None

    # Brute-force protection (per account, on top of the per-IP rate limit).
    login_max_failed_attempts: int = 5
    login_lockout_minutes: int = 15

    # External providers
    iucn_api_token: str = ""
    # Contact sent in the User-Agent (GBIF / Wikidata ask API clients for one).
    provider_contact: str = ""

    # Files produced by the app
    exports_dir: str = "./exports"
    # None -> <backend>/app/graphics (resolved in graphics_service)
    graphics_dir: str | None = None
    graphics_cache_dir: str | None = None
    graphics_dpi: str = "200"
    graphics_max_rss_mb: int = 350
    graphics_max_concurrent: int = 1
    # Graphics jobs waiting for or running R, across all users.
    graphics_max_pending_jobs: int = 5

    # Background jobs (bulk import, batch lookup, graphics) one user may have
    # queued or running at the same time, per job type.
    max_active_jobs_per_user: int = 1

    # Housekeeping: finished jobs / generated files older than this are purged.
    job_ttl_seconds: int = 3600
    exports_retention_hours: int = 24
    graphics_retention_hours: int = 24

    # Batch species lookup: species processed in parallel (providers stay throttled
    # by the per-species delay) and provider-result cache lifetime.
    lookup_batch_concurrency: int = 3
    provider_cache_ttl_seconds: int = 86400

    @model_validator(mode="after")
    def _refuse_weak_secret(self) -> "Settings":
        if self.environment in ("development", "test"):
            return self
        if (
            self.jwt_secret_key in _WEAK_JWT_SECRETS
            or len(self.jwt_secret_key) < _MIN_JWT_SECRET_LENGTH
        ):
            raise ValueError(
                f"JWT_SECRET_KEY must be a random string of at least {_MIN_JWT_SECRET_LENGTH} "
                f"characters when ENVIRONMENT={self.environment!r}. Generate one with: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def docs_enabled(self) -> bool:
        if self.api_docs_enabled is not None:
            return self.api_docs_enabled
        return self.environment != "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
