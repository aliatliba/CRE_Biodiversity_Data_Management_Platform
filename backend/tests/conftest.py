import os

# --- Test isolation -----------------------------------------------------------
# These MUST be set before any ``app.*`` import: ``app.core.db`` builds its engine
# from get_settings() at import time and ``lifespan`` seeds the database unless
# ENVIRONMENT == "test". Without this the suite would run against whatever
# DATABASE_URL is in .env (i.e. the dev database).
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg2://biodiversity:biodiversity@localhost:5432/biodiversity_test_db",
)
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.core.db import Base  # noqa: E402
from app.core.dependencies import get_db  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.main import app  # noqa: E402
from app.models.role import Role  # noqa: E402
from app.models.user import User  # noqa: E402

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def setup_test_db():
    """Fresh schema for the whole run. Requested by db_session (and autoused by
    tests/integration), so unit tests run without a database."""
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    """Logins in fixtures would otherwise trip the 5/minute login limit.
    Tests that exercise the limiter enable it explicitly."""
    from app.core.limiter import limiter

    limiter.enabled = False
    limiter.reset()
    yield
    limiter.enabled = False
    limiter.reset()


class FakeProviders:
    """Canned provider answers; anything not configured returns "no data"."""

    def __init__(self):
        self.data: dict[str, dict] = {}
        self.errors: dict[str, str] = {}
        self.calls: list[tuple[str, str]] = []
        self.delay = 0.0

    def client_class(self, source: str):
        fake = self

        class _Client:
            def __init__(self):
                self.source = source

            async def search(self, scientific_name: str):
                import asyncio

                from app.integrations.base import ProviderResult

                fake.calls.append((source, scientific_name))
                if fake.delay:
                    await asyncio.sleep(fake.delay)
                if source in fake.errors:
                    return ProviderResult(source, {}, error=fake.errors[source])
                return ProviderResult(source, dict(fake.data.get(source, {})))

        _Client.__name__ = {
            "gbif": "GbifClient",
            "wikidata": "WikidataClient",
            "iucn": "IucnClient",
            "powo": "PowoClient",
            "inaturalist": "InaturalistClient",
        }[source]
        return _Client


@pytest.fixture(autouse=True)
def fake_providers(monkeypatch):
    """No test may reach the real GBIF / IUCN / POWO / Wikidata / iNaturalist APIs."""
    from app.services import species_service

    fake = FakeProviders()
    species_service._provider_cache.clear()
    for attr, source in {
        "GbifClient": "gbif",
        "WikidataClient": "wikidata",
        "IucnClient": "iucn",
        "PowoClient": "powo",
        "InaturalistClient": "inaturalist",
    }.items():
        monkeypatch.setattr(species_service, attr, fake.client_class(source))
    return fake


@pytest.fixture
def db_session(setup_test_db):
    """Session bound to an outer transaction that is always rolled back.

    ``join_transaction_mode="create_savepoint"`` makes the app's own
    ``commit()`` calls release a SAVEPOINT instead of committing the outer
    transaction, so no state leaks between tests.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_role(db_session):
    role = db_session.query(Role).filter(Role.name == "admin").first()
    if not role:
        role = Role(name="admin", description="Administrator")
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)
    return role


@pytest.fixture
def researcher_role(db_session):
    role = db_session.query(Role).filter(Role.name == "researcher").first()
    if not role:
        role = Role(name="researcher", description="Researcher")
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)
    return role


@pytest.fixture
def admin_user(db_session, admin_role):
    user = User(
        email="admin@test.local",
        hashed_password=get_password_hash("admin123"),
        full_name="Test Admin",
        role_id=admin_role.id,
        must_change_password=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def researcher_user(db_session, researcher_role):
    user = User(
        email="researcher@test.local",
        hashed_password=get_password_hash("researcher123"),
        full_name="Test Researcher",
        role_id=researcher_role.id,
        must_change_password=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_headers(client, admin_user):
    resp = client.post("/api/v1/auth/login", json={
        "email": "admin@test.local",
        "password": "admin123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def researcher_headers(client, researcher_user):
    resp = client.post("/api/v1/auth/login", json={
        "email": "researcher@test.local",
        "password": "researcher123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
