from fastapi import APIRouter, Request

from app.core.dependencies import CurrentUser, DBSession
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserProfileResponse
from app.schemas.user import CompleteProfileRequest, UpdateOwnProfileRequest
from app.services import auth_service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, login_data: LoginRequest, db: DBSession):
    return auth_service.login_user(db, login_data)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def refresh(request: Request, refresh_data: RefreshRequest, db: DBSession):
    """Rotates the refresh token: the one sent is revoked, a new pair is returned."""
    return auth_service.refresh_access_token(db, refresh_data)


@router.post("/logout")
@limiter.limit("30/minute")
def logout(request: Request, refresh_data: RefreshRequest, db: DBSession):
    auth_service.revoke_refresh_token(db, refresh_data.refresh_token)
    return {"detail": "Logged out successfully"}


@router.post("/logout-all")
def logout_all(db: DBSession, current_user: CurrentUser):
    """Signs the user out on every device (all access and refresh tokens)."""
    auth_service.revoke_all_sessions(db, current_user)
    db.commit()
    return {"detail": "Signed out of all sessions"}


def _profile(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role.name,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
    )


@router.get("/me", response_model=UserProfileResponse)
def me(current_user: CurrentUser):
    return _profile(current_user)


@router.patch("/me", response_model=UserProfileResponse)
def update_me(data: UpdateOwnProfileRequest, db: DBSession, current_user: CurrentUser):
    """Lets any signed-in user view-and-edit their own profile info
    (full name, phone) without needing admin rights or a password."""
    user = auth_service.update_own_profile(
        db, current_user, full_name=data.full_name, phone=data.phone
    )
    return _profile(user)


@router.post("/complete-profile", response_model=TokenResponse)
@limiter.limit("10/minute")
def complete_profile(
    request: Request, data: CompleteProfileRequest, db: DBSession, current_user: CurrentUser
):
    """First-login flow: the user swaps the temporary password an admin
    gave them for a real one, and (optionally) fills in name/phone.
    Works for any authenticated user, not just ones flagged
    must_change_password, so it also serves as a general change-password
    endpoint later on.

    Changing the password signs out every other session; the response carries
    the new token pair for this one.
    """
    return auth_service.complete_profile(
        db,
        current_user,
        current_password=data.current_password,
        new_password=data.new_password,
        full_name=data.full_name,
        phone=data.phone,
    )
