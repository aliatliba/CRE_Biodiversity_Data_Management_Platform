import uuid
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any

import bcrypt
import jwt

from app.core.config import get_settings

# bcrypt only looks at the first 72 bytes; longer passwords are rejected at the
# schema level (see app.schemas.user) instead of being silently truncated.
BCRYPT_MAX_PASSWORD_BYTES = 72


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        # Malformed hash, or a password over 72 bytes (bcrypt >= 5 raises).
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


@lru_cache(maxsize=1)
def _dummy_hash() -> str:
    return get_password_hash(uuid.uuid4().hex)


def burn_password_check(password: str) -> None:
    """Spend the same bcrypt time as a real check, so the login response time does
    not reveal whether an email has an account."""
    verify_password(password, _dummy_hash())


def create_access_token(user_id: int, token_version: int) -> str:
    """``ver`` must match ``User.token_version``; bumping that column (password change,
    "sign out everywhere") invalidates every access token issued before."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "ver": token_version,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: int, jti: str, expires_at: datetime) -> str:
    """The ``jti`` is the key of the matching ``refresh_tokens`` row (rotation and
    revocation are tracked in the database)."""
    settings = get_settings()
    payload = {
        "sub": str(user_id),
        "jti": jti,
        "type": "refresh",
        "iat": datetime.now(timezone.utc),
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any] | None:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
