from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import DBSession, get_current_user
from app.core.limiter import limiter
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.services import auth_service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, login_data: LoginRequest, db: DBSession):
    return auth_service.login_user(db, login_data)


@router.post("/refresh", response_model=TokenResponse)
def refresh(refresh_data: RefreshRequest, db: DBSession):
    return auth_service.refresh_access_token(db, refresh_data)


@router.post("/logout")
def logout(refresh_data: RefreshRequest):
    auth_service.revoke_refresh_token(refresh_data.refresh_token)
    return {"detail": "Logged out successfully"}


@router.get("/me")
def me(current_user = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.name,
        "is_active": current_user.is_active,
    }
