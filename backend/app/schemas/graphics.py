from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GraphicsGenerateRequest(BaseModel):
    site_id: int


class GraphicsJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: str
    status: str

    site_id: int | None
    site_name: str | None

    total_species: int
    processed: int

    started_at: datetime | None
    finished_at: datetime | None

    error: str | None

    png_available: bool
    tiff_available: bool
    pdf_available: bool