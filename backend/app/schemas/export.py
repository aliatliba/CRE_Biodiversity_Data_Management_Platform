from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ExportFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Site filters
    site_ids: list[int] | None = None

    # Taxonomy filters
    kingdom: str | None = None
    class_name: str | None = None
    order_name: str | None = None
    family: str | None = None
    genus: str | None = None

    # Search
    search: str | None = None

    # Conservation filters
    iucn_status: str | None = None
    iucn_trend: str | None = None
    national_status: str | None = None

    # Validation date filters
    date_from: datetime | None = None
    date_to: datetime | None = None


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
    file_path: str | None
    created_at: datetime
    completed_at: datetime | None