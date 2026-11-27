import re
from datetime import datetime
from urllib.parse import urlsplit

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


URL_MAX_LENGTH = 2048
_HAS_SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*://")


def _website_url(value: str | None) -> str | None:
    """A link shown to users: http(s) only, so it can never be a ``javascript:`` or
    ``data:`` URL. "" means no link; a missing scheme gets https://."""
    if value is None or not value.strip():
        return None
    value = value.strip()
    if not _HAS_SCHEME.match(value):
        value = f"https://{value}"
    try:
        parts = urlsplit(value)
        parts.port  # noqa: B018  (raises ValueError on a malformed port)
    except ValueError:
        raise ValueError("must be a valid web address") from None
    host = parts.hostname or ""
    if (
        parts.scheme.lower() not in ("http", "https")
        or "." not in host
        or any(ch.isspace() for ch in value)
    ):
        raise ValueError("must be a valid web address (http:// or https://)")
    return value


class DesignationResponse(BaseModel):
    """A catalog entry (app.core.designations). On a site, ``url`` is that site's own
    link for the designation; it is None in the catalog itself."""
    id: str
    name_en: str
    name_fr: str
    short_name: str
    icon: str
    official_url: str | None
    sort_order: int
    url: str | None = None


class SiteDesignationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    designation_id: Text(50, min_length=1)
    url: Text(URL_MAX_LENGTH) | None = None

    _url = field_validator("url")(_website_url)


class SiteDesignationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # null or "" removes the link.
    url: Text(URL_MAX_LENGTH) | None

    _url = field_validator("url")(_website_url)


class SiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str | None
    description: str | None
    created_by: int | None
    # Sorted by the catalog order.
    designations: list[DesignationResponse] = []
    # None: no photo. Otherwise GET /sites/{id}/photo?v=<this value> serves it.
    photo_updated_at: datetime | None = None


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
