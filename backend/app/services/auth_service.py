from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, decode_token, verify_password, TokenError
from app.models.user import User
from app.repositories.user_repository import UserRepository


class InvalidCredentialsError(Exception):
    pass


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if user is None or not user.is_active or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError("Invalid email or password")
        return user

    def login(self, email: str, password: str) -> tuple[str, str]:
        user = self.authenticate(email, password)
        return create_access_token(user.id), create_refresh_token(user.id)

    def refresh(self, refresh_token: str) -> str:
        try:
            user_id = decode_token(refresh_token, expected_type="refresh")
        except TokenError as exc:
            raise InvalidCredentialsError(str(exc)) from exc

        user = self.users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise InvalidCredentialsError("User no longer active")
        return create_access_token(user.id)
