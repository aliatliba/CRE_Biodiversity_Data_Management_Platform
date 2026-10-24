from app.core.limiter import limiter


def test_login_rate_limit_returns_429(client, admin_user):
    limiter.enabled = True
    limiter.reset()
    payload = {"email": "admin@test.local", "password": "wrong-password"}

    statuses = [client.post("/api/v1/auth/login", json=payload).status_code for _ in range(7)]

    assert statuses[:5] == [401] * 5
    assert 429 in statuses
    assert 500 not in statuses
