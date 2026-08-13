def test_login_success(client, admin_user):
    resp = client.post("/api/v1/auth/login", json={
        "email": "admin@test.local",
        "password": "admin123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_invalid_password(client, admin_user):
    resp = client.post("/api/v1/auth/login", json={
        "email": "admin@test.local",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_get_me(client, admin_headers):
    resp = client.get("/api/v1/auth/me", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.local"


def test_refresh_token(client, admin_user):
    login = client.post("/api/v1/auth/login", json={
        "email": "admin@test.local",
        "password": "admin123",
    }).json()
    refresh_token = login["refresh_token"]
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
