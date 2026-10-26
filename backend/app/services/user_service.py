from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserUpdate


def list_roles(db: Session) -> list[Role]:
    return db.query(Role).order_by(Role.id).all()


def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.full_name, User.id).all()


def get_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found")
    return user


def create_user(db: Session, email: str, password: str, full_name: str, role_id: int, phone: str | None = None) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ConflictError("User with this email already exists")
    _get_role(db, role_id)
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


def _admin_role(db: Session) -> Role | None:
    return db.query(Role).filter(Role.name == "admin").first()


def _get_role(db: Session, role_id: int) -> Role:
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise BadRequestError("Unknown role")
    return role


def update_user(db: Session, user_id: int, data: UserUpdate, acting_admin_id: int) -> User:
    user = get_user(db, user_id)
    changes = data.model_dump(exclude_unset=True)

    if user.id == acting_admin_id and changes.get("is_active") is False:
        raise BadRequestError("You cannot deactivate your own account")

    if "role_id" in changes:
        _get_role(db, changes["role_id"])

    admin_role = _admin_role(db)
    is_admin_now = admin_role is not None and user.role_id == admin_role.id
    loses_admin = is_admin_now and (
        ("role_id" in changes and changes["role_id"] != admin_role.id)
        or changes.get("is_active") is False
    )
    if loses_admin:
        if user.id == acting_admin_id:
            raise BadRequestError("You cannot remove your own admin role")
        other_active_admins = (
            db.query(User)
            .filter(User.role_id == admin_role.id, User.is_active.is_(True), User.id != user.id)
            .count()
        )
        if other_active_admins == 0:
            raise BadRequestError("At least one active admin must remain")

    for field, value in changes.items():
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
