from app.core.security import get_password_hash, verify_password, create_access_token, decode_token


def test_password_hashing():
    password = "testpassword123"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_jwt_token_lifecycle():
    token = create_access_token({"sub": "1"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "1"
    assert payload["type"] == "access"
    assert decode_token("invalid.token.here") is None
