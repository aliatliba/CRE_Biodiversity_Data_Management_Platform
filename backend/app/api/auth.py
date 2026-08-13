from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import DBSession, CurrentUser, get_current_user
from app.core.limiter import limiter
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.schemas.user import CompleteProfileRequest, UserResponse
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
        "phone": current_user.phone,
        "role": current_user.role.name,
        "is_active": current_user.is_active,
        "must_change_password": current_user.must_change_password,
    }


@router.post("/complete-profile", response_model=UserResponse)
def complete_profile(data: CompleteProfileRequest, db: DBSession, current_user: CurrentUser):
    """First-login flow: the user swaps the temporary password an admin
    gave them for a real one, and (optionally) fills in name/phone.
    Works for any authenticated user, not just ones flagged
    must_change_password, so it also serves as a general change-password
    endpoint later on.
    """
    return auth_service.complete_profile(
        db,
        current_user,
        current_password=data.current_password,
        new_password=data.new_password,
        full_name=data.full_name,
        phone=data.phone,
    )
