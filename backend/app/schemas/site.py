from pydantic import BaseModel, ConfigDict


class SiteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    code: str | None = None
    description: str | None = None


class SiteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = None
    code: str | None = None
    description: str | None = None


class SiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str | None
    description: str | None
    created_by: int
