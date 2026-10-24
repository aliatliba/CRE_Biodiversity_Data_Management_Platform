from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest

# In-memory revoked refresh token store for V1.
# Migrate to a database table (refresh_tokens) when scaling beyond single-instance.
_revoked_refresh_tokens: set[str] = set()


def authenticate_user(db: Session, login: LoginRequest) -> User:
    user = db.query(User).filter(User.email == login.email).first()
    if not user or not verify_password(login.password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password")
    if not user.is_active:
        raise UnauthorizedError("User account is deactivated")
    return user


def login_user(db: Session, login: LoginRequest) -> dict[str, Any]:
    user = authenticate_user(db, login)
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        # Tells the frontend to route the user to the "set your password"
        # screen instead of the main app.
        "must_change_password": user.must_change_password,
    }


def refresh_access_token(db: Session, req: RefreshRequest) -> dict[str, str]:
    payload = decode_token(req.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token")
    if req.refresh_token in _revoked_refresh_tokens:
        raise UnauthorizedError("Refresh token has been revoked")
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise UnauthorizedError("Invalid refresh token")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or deactivated")
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "refresh_token": req.refresh_token,
        "token_type": "bearer",
    }


def revoke_refresh_token(refresh_token: str) -> None:
    _revoked_refresh_tokens.add(refresh_token)


def complete_profile(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
    full_name: str | None = None,
    phone: str | None = None,
) -> User:
    """First-login flow: verify the temp password, set a new one, and let
    the user fill in the rest of their profile. Also works as a general
    'change password' endpoint after that."""
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
    db.commit()
    db.refresh(user)
    return user


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
