from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

SourceProvider = Literal["wikidata", "gbif", "iucn", "powo", "inaturalist", "manual"]


class FieldSourceEntry(BaseModel):
    source: SourceProvider
    reference: str | None = None
    retrieved_at: datetime | None = None


class SpeciesLookupRequest(BaseModel):
    scientific_name: str


class SpeciesDraft(BaseModel):
    """What /species/lookup returns: values + sources, nothing persisted yet."""

    scientific_name: str
    kingdom: str | None = None
    class_name: str | None = None
    order_name: str | None = None
    family: str | None = None
    genus: str | None = None
    species_epithet: str | None = None
    common_name: str | None = None
    raw_taxonomy_extra: dict[str, Any] | None = None
    iucn_status: str | None = None
    iucn_trend: str | None = None
    field_sources: dict[str, FieldSourceEntry] = {}


class SpeciesCreate(BaseModel):
    """Body for POST /species — the researcher-reviewed, ready-to-validate record."""

    scientific_name: str
    kingdom: str | None = None
    class_name: str | None = None
    order_name: str | None = None
    family: str | None = None
    genus: str | None = None
    species_epithet: str | None = None
    common_name: str | None = None
    raw_taxonomy_extra: dict[str, Any] | None = None
    field_sources: dict[str, FieldSourceEntry] | None = None
    iucn_status: str | None = None
    iucn_trend: str | None = None
    guild: str | None = None
    ecosystem_service: str | None = None
    habitat: str | None = None
    typology: str | None = None
    endemism: str | None = None
    potential_threats: str | None = None
    reference: str | None = None
    site_id: int


class SpeciesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    guild: str | None = None
    ecosystem_service: str | None = None
    habitat: str | None = None
    typology: str | None = None
    endemism: str | None = None
    potential_threats: str | None = None
    reference: str | None = None
    iucn_status: str | None = None
    iucn_trend: str | None = None


class SpeciesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    scientific_name: str
    kingdom: str | None
    class_name: str | None
    order_name: str | None
    family: str | None
    genus: str | None
    species_epithet: str | None
    common_name: str | None
    raw_taxonomy_extra: dict[str, Any] | None
    field_sources: dict[str, Any] | None
    iucn_status: str | None
    iucn_trend: str | None
    national_status: str
    guild: str | None
    ecosystem_service: str | None
    habitat: str | None
    typology: str | None
    endemism: str | None
    potential_threats: str | None
    reference: str | None
    status: str
    created_by: int
    validated_by: int | None
    validated_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SiteSpeciesCreate(BaseModel):
    species_id: int
    notes: str | None = None


class SiteSpeciesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    site_id: int
    species_id: int
    recorded_by: int
    notes: str | None
    created_at: datetime
