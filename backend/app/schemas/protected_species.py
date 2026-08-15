from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProtectedSpeciesCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scientific_name: str
    source_reference: str | None = None


class ProtectedSpeciesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    scientific_name: str
    source_reference: str | None
    added_by: int
    created_at: datetime
