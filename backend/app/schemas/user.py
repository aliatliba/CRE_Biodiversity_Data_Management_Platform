from pydantic import BaseModel, ConfigDict, EmailStr, model_validator

from app.schemas.common import Password, PasswordInput, Text


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None

class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: Password
    full_name: Text(150, min_length=1)
    phone: Text(30) | None = None
    role_id: int


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: Text(150, min_length=1) | None = None
    phone: Text(30) | None = None
    role_id: int | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def _no_null_for_required_columns(self) -> "UserUpdate":
        # Omitting a field leaves it unchanged; sending null for a NOT NULL column is an error.
        for field in ("full_name", "role_id", "is_active"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    phone: str | None = None
    role_id: int
    is_active: bool
    must_change_password: bool


class CompleteProfileRequest(BaseModel):
    """Submitted by a user on their first login to set a permanent password
    and fill in the rest of their profile."""
    model_config = ConfigDict(extra="forbid")
    current_password: PasswordInput
    new_password: Password
    full_name: Text(150) | None = None
    phone: Text(30) | None = None


class UpdateOwnProfileRequest(BaseModel):
    """Lets the signed-in user edit their own display info — no password
    required, unlike complete-profile."""
    model_config = ConfigDict(extra="forbid")
    full_name: Text(150, min_length=1) | None = None
    phone: Text(30) | None = None
