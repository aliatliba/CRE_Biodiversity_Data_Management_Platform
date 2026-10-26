from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import Text


class GraphicsGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    site_id: int
    graphic_type: Text(50) = "dendrogram"


class GraphicTypeResponse(BaseModel):
    key: str
    label: str
    description: str
    formats: list[str]


class GraphicsJobResponse(BaseModel):
    job_id: str
    status: str
    graphic_type: str
    site_id: int | None = None
    site_name: str | None = None
    total_species: int = 0
    processed: int = 0
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None
    available_formats: list[str] = []
