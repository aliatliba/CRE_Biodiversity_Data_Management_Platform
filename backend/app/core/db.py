from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    poolclass=NullPool if settings.environment == "test" else None,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_extensions() -> None:
    """Create PostgreSQL extensions if they don't exist.

    Note: For production migrations, extensions are created via Alembic.
    This function is kept for development convenience and idempotency.
    """
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
