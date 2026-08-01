from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SiteBase(BaseModel):
    name: str
    code: str | None = None
    description: str | None = None


class SiteCreate(SiteBase):
    pass


class SiteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    code: str | None = None
    description: str | None = None


class SiteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    name: str
    code: str | None
    description: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime
