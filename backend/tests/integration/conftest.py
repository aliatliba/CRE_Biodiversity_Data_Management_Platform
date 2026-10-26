import pytest


@pytest.fixture(scope="session", autouse=True)
def _schema(setup_test_db):
    """Every integration test needs the test database schema."""
