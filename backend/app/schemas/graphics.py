from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import Text


class GraphicsGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    site_id: int
    graphic_type: Text(50) = "dendrogram"
    # Required by graphics whose spec has class_filter (e.g. family richness).
    class_names: list[Text(100, min_length=1)] | None = Field(None, max_length=50)


class GraphicTypeResponse(BaseModel):
    key: str
    label: str
    description: str
    formats: list[str]
    class_filter: bool = False


class SiteClassResponse(BaseModel):
    class_name: str
    species_count: int


class GraphicsJobResponse(BaseModel):
    job_id: str
    status: str
    graphic_type: str
    site_id: int | None = None
    site_name: str | None = None
    class_names: list[str] = []
    total_species: int = 0
    processed: int = 0
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None
    available_formats: list[str] = []
