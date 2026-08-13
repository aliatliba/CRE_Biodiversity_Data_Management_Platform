from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    refresh_token: str


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
