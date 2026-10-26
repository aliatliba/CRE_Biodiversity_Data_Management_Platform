from datetime import datetime, timedelta, timezone

from app.core.security import decode_token, get_password_hash
from app.models.refresh_token import RefreshToken
from app.models.user import User

LOGIN = {"email": "admin@test.local", "password": "admin123"}


def _login(client):
    r = client.post("/api/v1/auth/login", json=LOGIN)
    assert r.status_code == 200, r.text
    return r.json()


def _refresh(client, token):
    return client.post("/api/v1/auth/refresh", json={"refresh_token": token})


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_refresh_rotates_the_refresh_token(client, admin_user):
    first = _login(client)["refresh_token"]
    r = _refresh(client, first)
    assert r.status_code == 200
    second = r.json()["refresh_token"]
    assert second != first
    assert _refresh(client, second).status_code == 200


def test_reused_refresh_token_revokes_the_whole_session(client, admin_user, db_session):
    first = _login(client)["refresh_token"]
    second = _refresh(client, first).json()["refresh_token"]

    # Immediate reuse (two tabs racing) is refused, but the session survives.
    assert _refresh(client, first).status_code == 401
    third = _refresh(client, second).json()["refresh_token"]

    # Reuse after the grace window means the old token was copied: end the session.
    jti = decode_token(first)["jti"]
    row = db_session.query(RefreshToken).filter(RefreshToken.jti == jti).one()
    row.revoked_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    db_session.commit()

    assert _refresh(client, first).status_code == 401
    assert _refresh(client, third).status_code == 401


def test_logout_survives_in_the_database(client, admin_user, db_session):
    token = _login(client)["refresh_token"]
    assert client.post("/api/v1/auth/logout", json={"refresh_token": token}).status_code == 200
    jti = decode_token(token)["jti"]
    assert db_session.query(RefreshToken).filter(RefreshToken.jti == jti).one().revoked_at
    assert _refresh(client, token).status_code == 401


def test_password_change_signs_out_other_sessions(client, admin_user):
    stolen = _login(client)
    mine = _login(client)

    r = client.post(
        "/api/v1/auth/complete-profile",
        json={"current_password": "admin123", "new_password": "a-much-better-pass"},
        headers=_bearer(mine["access_token"]),
    )
    assert r.status_code == 200, r.text
    fresh = r.json()

    assert client.get("/api/v1/auth/me", headers=_bearer(stolen["access_token"])).status_code == 401
    assert _refresh(client, stolen["refresh_token"]).status_code == 401
    assert client.get("/api/v1/auth/me", headers=_bearer(fresh["access_token"])).status_code == 200
    assert _refresh(client, fresh["refresh_token"]).status_code == 200


def test_logout_all(client, admin_user):
    tokens = _login(client)
    r = client.post("/api/v1/auth/logout-all", headers=_bearer(tokens["access_token"]))
    assert r.status_code == 200
    assert client.get("/api/v1/auth/me", headers=_bearer(tokens["access_token"])).status_code == 401


def test_account_locks_after_repeated_failures(client, admin_user, db_session):
    for _ in range(5):
        r = client.post("/api/v1/auth/login", json={**LOGIN, "password": "wrong"})
        assert r.status_code == 401
    # Even the right password is refused while locked.
    assert client.post("/api/v1/auth/login", json=LOGIN).status_code == 429

    db_session.refresh(admin_user)
    admin_user.locked_until = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()
    assert client.post("/api/v1/auth/login", json=LOGIN).status_code == 200
    db_session.refresh(admin_user)
    assert admin_user.failed_login_attempts == 0


def test_unknown_email_gets_the_same_answer(client, admin_user):
    r = client.post("/api/v1/auth/login", json={"email": "nobody@test.local", "password": "x"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid email or password"


def test_password_rules(client, admin_headers, researcher_role):
    base = {"email": "new@test.local", "full_name": "New", "role_id": researcher_role.id}
    short = client.post("/api/v1/users", json={**base, "password": "short"}, headers=admin_headers)
    assert short.status_code == 422
    too_long = client.post(
        "/api/v1/users", json={**base, "password": "é" * 40}, headers=admin_headers
    )
    assert too_long.status_code == 422  # 80 bytes: more than bcrypt reads


def test_admin_must_change_seeded_password_before_admin_actions(client, db_session, admin_role):
    db_session.add(
        User(
            email="fresh-admin@test.local",
            hashed_password=get_password_hash("temp-pass-123"),
            full_name="Fresh",
            role_id=admin_role.id,
            must_change_password=True,
        )
    )
    db_session.commit()
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "fresh-admin@test.local", "password": "temp-pass-123"},
    ).json()["access_token"]
    assert client.get("/api/v1/users", headers=_bearer(token)).status_code == 403
