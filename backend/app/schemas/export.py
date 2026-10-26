import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import Text

_DATE_ONLY = re.compile(r"^\d{4}-\d{2}-\d{2}$")

FilterText = Text(255)


class ExportFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Site filters
    site_ids: list[int] | None = Field(None, max_length=500)

    # Taxonomy filters
    kingdom: FilterText | None = None
    class_name: FilterText | None = None
    order_name: FilterText | None = None
    family: FilterText | None = None
    genus: FilterText | None = None

    # Search
    search: FilterText | None = None

    # Conservation filters
    iucn_status: FilterText | None = None
    iucn_trend: FilterText | None = None
    national_status: FilterText | None = None

    # Validation date filters. A bare date (what <input type="date"> sends) covers
    # the whole day: date_from starts at 00:00, date_to ends at 23:59:59.999999 UTC.
    date_from: datetime | None = None
    date_to: datetime | None = None

    @field_validator("date_to", mode="before")
    @classmethod
    def _date_to_includes_whole_day(cls, value):
        if isinstance(value, str) and _DATE_ONLY.match(value):
            return f"{value}T23:59:59.999999+00:00"
        return value


class ExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    format: Literal["csv", "xlsx"]
    filters: ExportFilters | None = None


class ExportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    format: str
    filters: ExportFilters | None
    status: str
    created_at: datetime
    completed_at: datetime | None
