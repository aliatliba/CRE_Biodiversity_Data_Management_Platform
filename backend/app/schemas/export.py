from typing import Any
from pydantic import BaseModel, ConfigDict


class ExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    format: str  # csv or xlsx
    filters: dict[str, Any] | None = None


class ExportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    format: str
    filters: dict[str, Any] | None
    status: str
    file_path: str | None
    created_at: str
    completed_at: str | None
