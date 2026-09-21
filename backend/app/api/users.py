from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from typing import List

from app.core.dependencies import DBSession, AdminUser

from app.schemas.user import UserCreate, UserUpdate, UserResponse, RoleResponse

from app.services import auth_service

from app.models.role import Role


router = APIRouter()


@router.get("/roles", response_model=List[RoleResponse])
def list_roles(db: DBSession, admin: AdminUser):

    """So the frontend can populate a role picker without hardcoding IDs —
    role IDs are assigned at seed time, not fixed constants.
    """
    return db.query(Role).order_by(Role.id).all()


@router.get("", response_model=List[UserResponse])
def list_users(db: DBSession, admin: AdminUser):

    return db.query(auth_service.User).all()


@router.post("", response_model=UserResponse)
def create_user(data: UserCreate, db: DBSession, admin: AdminUser):

    return auth_service.create_user(
        db,
        data.email,
        data.password,
        data.full_name,
        data.role_id,
        data.phone,
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: DBSession, admin: AdminUser):

    user = (
        db.query(auth_service.User)
        .filter(auth_service.User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: DBSession,
    admin: AdminUser,
):
    user = (
        db.query(auth_service.User)
        .filter(auth_service.User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id and data.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: DBSession,
    admin: AdminUser,
):
    

    user = (
        db.query(auth_service.User)
        .filter(auth_service.User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Never allow an admin to delete their own account.
    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account",
        )

    # Deletion is only allowed after deactivation.
    if user.is_active:
        raise HTTPException(
            status_code=400,
            detail="User must be deactivated before permanent deletion",
        )

    db.delete(user)
    db.commit()

    return {
        "detail": "User permanently deleted"
    }