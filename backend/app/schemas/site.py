from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.schemas.common import Text


def _blank_code_is_none(value: str | None) -> str | None:
    # code is UNIQUE: two sites saved with "" would collide, so "" means "no code".
    return value or None


class SiteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Text(255, min_length=1)
    code: Text(50) | None = None
    description: Text(10_000) | None = None

    _code = field_validator("code")(_blank_code_is_none)


class SiteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Text(255, min_length=1) | None = None
    code: Text(50) | None = None
    description: Text(10_000) | None = None

    _code = field_validator("code")(_blank_code_is_none)

    @model_validator(mode="after")
    def _name_not_null(self) -> "SiteUpdate":
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("name cannot be null")
        return self


class SiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str | None
    description: str | None
    created_by: int | None


class SiteListItem(SiteResponse):
    """GET /sites row: the site plus its species counters."""
    species_count: int
    # Percentage of all site-species records (across every site) held by this site.
    species_share: float
    protected_count: int
    # IUCN CR / EN / VU
    threatened_count: int
    # Full taxonomy and an IUCN status
    complete_count: int
