from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None


class UserCreate(BaseModel):
    """Used by the admin to create a new user (e.g. a researcher).

    The password set here is a temporary one — the user is required to
    change it on first login.
    """
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str
    full_name: str
    role_id: int
    phone: str | None = None


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str | None = None
    phone: str | None = None
    role_id: int | None = None
    is_active: bool | None = None


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
    current_password: str
    new_password: str = Field(min_length=8)
    full_name: str | None = None
    phone: str | None = None


class ChangePasswordRequest(BaseModel):
    """Regular (not-first-login) password change, e.g. from a settings page."""
    model_config = ConfigDict(extra="forbid")
    current_password: str
    new_password: str = Field(min_length=8)
