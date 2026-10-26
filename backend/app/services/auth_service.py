import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import BadRequestError, TooManyRequestsError, UnauthorizedError
from app.core.security import (
    burn_password_check,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest

INVALID_CREDENTIALS = "Invalid email or password"

# Two tabs can refresh with the same token at nearly the same moment; the loser
# then presents a token revoked a second ago. Inside this window that is treated as
# a race (plain 401), after it as token theft (the whole family is revoked).
REUSE_GRACE = timedelta(seconds=30)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _register_failed_login(db: Session, user: User) -> None:
    settings = get_settings()
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= settings.login_max_failed_attempts:
        user.locked_until = _now() + timedelta(minutes=settings.login_lockout_minutes)
        user.failed_login_attempts = 0
    db.commit()


def authenticate_user(db: Session, login: LoginRequest) -> User:
    user = db.query(User).filter(User.email == login.email).first()
    if user is None:
        burn_password_check(login.password)
        raise UnauthorizedError(INVALID_CREDENTIALS)

    if user.locked_until is not None and user.locked_until > _now():
        raise TooManyRequestsError(
            "Too many failed sign-in attempts. Try again in a few minutes."
        )

    if not verify_password(login.password, user.hashed_password):
        _register_failed_login(db, user)
        raise UnauthorizedError(INVALID_CREDENTIALS)

    if user.failed_login_attempts or user.locked_until is not None:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()

    if not user.is_active:
        raise UnauthorizedError("User account is deactivated")
    return user


def _issue_refresh_token(db: Session, user: User, family_id: str) -> str:
    expires_at = _now() + timedelta(days=get_settings().refresh_token_expire_days)
    jti = uuid.uuid4().hex
    db.add(RefreshToken(jti=jti, family_id=family_id, user_id=user.id, expires_at=expires_at))
    return create_refresh_token(user.id, jti, expires_at)


def issue_session_tokens(db: Session, user: User, family_id: str | None = None) -> dict[str, Any]:
    """Access + refresh token pair. ``family_id`` None starts a new session."""
    refresh_token = _issue_refresh_token(db, user, family_id or uuid.uuid4().hex)
    db.commit()
    return {
        "access_token": create_access_token(user.id, user.token_version),
        "refresh_token": refresh_token,
        "token_type": "bearer",
        # Tells the frontend to route the user to the "set your password"
        # screen instead of the main app.
        "must_change_password": user.must_change_password,
    }


def _purge_expired_refresh_tokens(db: Session) -> None:
    db.query(RefreshToken).filter(RefreshToken.expires_at < _now()).delete(
        synchronize_session=False
    )


def login_user(db: Session, login: LoginRequest) -> dict[str, Any]:
    user = authenticate_user(db, login)
    _purge_expired_refresh_tokens(db)
    return issue_session_tokens(db, user)


def _revoke_family(db: Session, family_id: str) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None)
    ).update({RefreshToken.revoked_at: _now()}, synchronize_session=False)


def _stored_refresh_token(db: Session, raw_token: str) -> RefreshToken | None:
    payload = decode_token(raw_token)
    if payload is None or payload.get("type") != "refresh" or not payload.get("jti"):
        return None
    return db.query(RefreshToken).filter(RefreshToken.jti == payload["jti"]).first()


def refresh_access_token(db: Session, req: RefreshRequest) -> dict[str, Any]:
    stored = _stored_refresh_token(db, req.refresh_token)
    if stored is None:
        raise UnauthorizedError("Invalid refresh token")

    if stored.revoked_at is not None:
        if _now() - stored.revoked_at > REUSE_GRACE:
            # A rotated-out token came back: someone kept a copy. End the session.
            _revoke_family(db, stored.family_id)
            db.commit()
        raise UnauthorizedError("Refresh token has been revoked")

    user = db.query(User).filter(User.id == stored.user_id).first()
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or deactivated")

    stored.revoked_at = _now()
    return issue_session_tokens(db, user, family_id=stored.family_id)


def revoke_refresh_token(db: Session, refresh_token: str) -> None:
    """Sign-out: ends the session (token family) the refresh token belongs to."""
    stored = _stored_refresh_token(db, refresh_token)
    if stored is not None:
        _revoke_family(db, stored.family_id)
        db.commit()


def revoke_all_sessions(db: Session, user: User) -> None:
    """Invalidate every access and refresh token of ``user``. Does not commit."""
    user.token_version += 1
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)
    ).update({RefreshToken.revoked_at: _now()}, synchronize_session=False)


def complete_profile(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
    full_name: str | None = None,
    phone: str | None = None,
) -> dict[str, Any]:
    """First-login flow: verify the temp password, set a new one, and let
    the user fill in the rest of their profile. Also works as a general
    'change password' endpoint after that.

    Every existing session (including stolen ones) is signed out; the caller gets
    a fresh token pair so the current tab stays signed in.
    """
    if not verify_password(current_password, user.hashed_password):
        raise UnauthorizedError("Current password is incorrect")
    if verify_password(new_password, user.hashed_password):
        raise BadRequestError("New password must be different from the current password")
    user.hashed_password = get_password_hash(new_password)
    user.must_change_password = False
    if full_name:
        user.full_name = full_name
    if phone is not None:
        user.phone = phone
    revoke_all_sessions(db, user)
    db.flush()
    return issue_session_tokens(db, user)


def update_own_profile(
    db: Session,
    user: User,
    full_name: str | None = None,
    phone: str | None = None,
) -> User:
    """Edit-your-own-profile flow: name/phone only, no password touched."""
    if full_name is not None:
        user.full_name = full_name
    if phone is not None:
        user.phone = phone
    db.commit()
    db.refresh(user)
    return user
