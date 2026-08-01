from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import TokenError, decode_token
from app.dependencies.db import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

# tokenUrl is only used to populate OpenAPI docs; the actual login endpoint
# accepts a JSON body, not a form, per README Section 10.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_error

    try:
        user_id = decode_token(token, expected_type="access")
    except TokenError as exc:
        raise credentials_error from exc

    user = UserRepository(db).get_by_id(user_id)
    if user is None or not user.is_active:
        raise credentials_error
    return user


def require_role(*allowed_role_names: str):
    """Usage: Depends(require_role("admin"))"""

    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in allowed_role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed_role_names)}",
            )
        return current_user

    return _dependency
