from pydantic import BaseModel, ConfigDict

from app.schemas.common import PasswordInput, Text


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: Text(254, min_length=1)
    password: PasswordInput


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    refresh_token: Text(4096, min_length=1)


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str | None
    role: str
    is_active: bool
    must_change_password: bool
