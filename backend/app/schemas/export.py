from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class ExportRequest(BaseModel):
    format: Literal["csv", "xlsx"]
    filters: dict[str, Any] | None = None


class ExportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    requested_by: int
    format: str
    filters: dict[str, Any] | None
    status: str
    file_path: str | None
    created_at: datetime
    completed_at: datetime | None
