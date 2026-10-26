from app.core.limiter import limiter


def test_login_rate_limit_returns_429(client, admin_user):
    limiter.enabled = True
    limiter.reset()
    payload = {"email": "admin@test.local", "password": "wrong-password"}

    responses = [client.post("/api/v1/auth/login", json=payload) for _ in range(7)]
    statuses = [r.status_code for r in responses]

    assert statuses[:5] == [401] * 5
    assert 429 in statuses
    assert 500 not in statuses
    # Same {"detail": ...} shape as other errors, so the UI can show it.
    limited = next(r for r in responses if r.status_code == 429)
    assert "detail" in limited.json()
