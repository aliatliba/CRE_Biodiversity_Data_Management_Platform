from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
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


BACKEND_DIR = Path(__file__).resolve().parents[2]


def assert_schema_is_current() -> None:
    """Fail fast, with the fix in the message, when the database has not been
    migrated to the revision this code expects (otherwise the first query dies on a
    missing column)."""
    from alembic.config import Config
    from alembic.runtime.migration import MigrationContext
    from alembic.script import ScriptDirectory

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    expected = set(ScriptDirectory.from_config(config).get_heads())
    with engine.connect() as conn:
        current = set(MigrationContext.configure(conn).get_current_heads())
    if current != expected:
        raise RuntimeError(
            f"Database schema is at revision {', '.join(sorted(current)) or 'none'} but this "
            f"code expects {', '.join(sorted(expected))}. Run `alembic upgrade head` "
            "from the backend/ directory, then start the API again."
        )
