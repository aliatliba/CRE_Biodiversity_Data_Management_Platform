from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserUpdate


def list_roles(db: Session) -> list[Role]:
    return db.query(Role).order_by(Role.id).all()


def list_users(db: Session) -> list[User]:
    return db.query(User).all()


def get_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found")
    return user


def create_user(db: Session, email: str, password: str, full_name: str, role_id: int, phone: str | None = None) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ConflictError("User with this email already exists")
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        phone=phone,
        role_id=role_id,
        # Admin-provided password is temporary: force a change on first login.
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, data: UserUpdate, acting_admin_id: int) -> User:
    user = get_user(db, user_id)

    if user.id == acting_admin_id and data.is_active is False:
        raise BadRequestError("You cannot deactivate your own account")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int, acting_admin_id: int) -> None:
    user = get_user(db, user_id)

    # Never allow an admin to delete their own account.
    if user.id == acting_admin_id:
        raise BadRequestError("You cannot delete your own account")

    # Deletion is only allowed after deactivation.
    if user.is_active:
        raise BadRequestError("User must be deactivated before permanent deletion")

    db.delete(user)
    db.commit()
