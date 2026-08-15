from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://biodiversity:biodiversity@db:5432/biodiversity_db"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173,https://bio-observer.lovable.app,https://id-preview--56f2ff30-c80b-4597-8982-4103f111551d.lovable.app,https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--017acfb7.local-credentialless.webcontainer-api.io"  # add this
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
    

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
