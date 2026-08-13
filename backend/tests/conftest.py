import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.db import Base
from app.core.dependencies import get_db
from app.core.config import get_settings
from app.models.role import Role
from app.models.user import User
from app.core.security import get_password_hash

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg2://biodiversity:biodiversity@localhost:5432/biodiversity_test_db"
)

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
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
