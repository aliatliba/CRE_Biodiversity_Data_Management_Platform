from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import DBSession, AdminUser
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services import auth_service

router = APIRouter()


@router.get("", response_model=List[UserResponse])
def list_users(db: DBSession, admin: AdminUser):
    return db.query(auth_service.User).all()


@router.post("", response_model=UserResponse)
def create_user(data: UserCreate, db: DBSession, admin: AdminUser):
    return auth_service.create_user(
        db, data.email, data.password, data.full_name, data.role_id
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: DBSession, admin: AdminUser):
    user = db.query(auth_service.User).filter(auth_service.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: UserUpdate, db: DBSession, admin: AdminUser):
    user = db.query(auth_service.User).filter(auth_service.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(user_id: int, db: DBSession, admin: AdminUser):
    user = db.query(auth_service.User).filter(auth_service.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"detail": "User deactivated"}
