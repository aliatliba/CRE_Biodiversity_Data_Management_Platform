from typing import List

from fastapi import APIRouter

from app.core.dependencies import AdminUser, DBSession
from app.schemas.user import RoleResponse, UserCreate, UserResponse, UserUpdate
from app.services import user_service

router = APIRouter()


@router.get("/roles", response_model=List[RoleResponse])
def list_roles(db: DBSession, admin: AdminUser):
    """So the frontend can populate a role picker without hardcoding IDs —
    role IDs are assigned at seed time, not fixed constants.
    """
    return user_service.list_roles(db)


@router.get("", response_model=List[UserResponse])
def list_users(db: DBSession, admin: AdminUser):
    return user_service.list_users(db)


@router.post("", response_model=UserResponse)
def create_user(data: UserCreate, db: DBSession, admin: AdminUser):
    return user_service.create_user(
        db,
        data.email,
        data.password,
        data.full_name,
        data.role_id,
        data.phone,
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: DBSession, admin: AdminUser):
    return user_service.get_user(db, user_id)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: UserUpdate, db: DBSession, admin: AdminUser):
    return user_service.update_user(db, user_id, data, admin.id)


@router.delete("/{user_id}")
def delete_user(user_id: int, db: DBSession, admin: AdminUser):
    user_service.delete_user(db, user_id, admin.id)
    return {"detail": "User permanently deleted"}
