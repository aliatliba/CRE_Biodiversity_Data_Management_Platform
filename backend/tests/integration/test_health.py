from sqlalchemy.exc import OperationalError


def test_health_ok(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_health_503_when_db_down(client, monkeypatch):
    import app.main as main

    class BrokenEngine:
        def connect(self):
            raise OperationalError("SELECT 1", {}, Exception("db down"))

    monkeypatch.setattr(main, "engine", BrokenEngine())
    r = client.get("/health")
    assert r.status_code == 503
