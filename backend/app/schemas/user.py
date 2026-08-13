from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str
    full_name: str
    role_id: int


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str | None = None
    role_id: int | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role_id: int
    is_active: bool
