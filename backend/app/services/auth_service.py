from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.models.role import Role
from app.schemas.auth import LoginRequest, RefreshRequest

# In-memory revoked refresh token store for V1.
# Migrate to a database table (refresh_tokens) when scaling beyond single-instance.
_revoked_refresh_tokens: set[str] = set()


def authenticate_user(db: Session, login: LoginRequest) -> User:
    user = db.query(User).filter(func.lower(User.email) == func.lower(login.email)).first()
    if not user or not verify_password(login.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
        )
    return user


def login_user(db: Session, login: LoginRequest) -> dict[str, str]:
    user = authenticate_user(db, login)
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


def refresh_access_token(db: Session, req: RefreshRequest) -> dict[str, str]:
    payload = decode_token(req.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    if req.refresh_token in _revoked_refresh_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "refresh_token": req.refresh_token,
        "token_type": "bearer",
    }


def revoke_refresh_token(refresh_token: str) -> None:
    _revoked_refresh_tokens.add(refresh_token)


def create_user(db: Session, email: str, password: str, full_name: str, role_id: int) -> User:
    existing = db.query(User).filter(func.lower(User.email) == func.lower(email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        role_id=role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
