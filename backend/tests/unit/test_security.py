from datetime import datetime, timedelta, timezone

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing():
    password = "testpassword123"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_hashes_from_passlib_still_verify():
    # passlib's bcrypt hashes ($2b$) stay valid after the switch to the bcrypt package.
    passlib_hash = "$2b$12$euqz48QIkEfyocoakrnYPeH2BnD4e1SUKCnZeBkGBhPWlCs79F63m"
    assert verify_password("legacy-pass-123", passlib_hash)
    assert not verify_password("wrong", passlib_hash)
    assert verify_password("x", "not-a-hash") is False


def test_password_over_72_bytes_is_rejected_not_crashing():
    hashed = get_password_hash("short-password")
    assert verify_password("é" * 50, hashed) is False


def test_jwt_token_lifecycle():
    token = create_access_token(1, token_version=3)
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "1"
    assert payload["ver"] == 3
    assert payload["type"] == "access"
    assert decode_token("invalid.token.here") is None


def test_refresh_token_carries_jti():
    expires = datetime.now(timezone.utc) + timedelta(days=1)
    payload = decode_token(create_refresh_token(7, "abc123", expires))
    assert payload["type"] == "refresh" and payload["jti"] == "abc123"


def test_expired_token_is_rejected():
    expired = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert decode_token(create_refresh_token(7, "old", expired)) is None
