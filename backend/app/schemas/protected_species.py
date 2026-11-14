from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import ScientificName, Text


class ProtectedSpeciesCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scientific_name: ScientificName
    source_reference: Text(2000) | None = None
    common_name_fr: Text(255) | None = None
    taxon_group: Text(50) | None = None


class ProtectedSpeciesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    scientific_name: str
    source_reference: str | None
    decree: str | None = None
    kingdom: str | None = None
    taxon_group: str | None = None
    family: str | None = None
    common_name_fr: str | None = None
    common_name_ar: str | None = None
    verification_status: str | None = None
    verification_note: str | None = None
    added_by: int | None
    created_at: datetime


class ProtectedSpeciesListItem(ProtectedSpeciesResponse):
    # Names as printed in the decree, when different from scientific_name.
    printed_names: list[str] = []
    # Other names that also mark a recorded species as protected (synonyms, old names).
    synonyms: list[str] = []
    # The recorded species carrying one of this entry's names, and its IUCN status;
    # None when the taxon has not been recorded yet (or has no IUCN status).
    recorded_species_id: int | None = None
    iucn_status: str | None = None


class TaxonGroupCount(BaseModel):
    taxon_group: str
    count: int
