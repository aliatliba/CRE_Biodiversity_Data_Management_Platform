from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import ScientificName, Text


class ProtectedSpeciesCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scientific_name: ScientificName
    source_reference: Text(2000) | None = None


class ProtectedSpeciesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    scientific_name: str
    source_reference: str | None
    added_by: int | None
    created_at: datetime


class ProtectedSpeciesListItem(ProtectedSpeciesResponse):
    # IUCN status of the recorded species with this name; None when the species has
    # not been recorded yet or has no IUCN status.
    iucn_status: str | None = None
