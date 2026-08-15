from typing import Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class Taxonomy(BaseModel):
    kingdom: str | None = None
    class_name: str | None = None
    order_name: str | None = None
    family: str | None = None
    genus: str | None = None
    species_epithet: str | None = None
    common_name: str | None = None
    raw_extra: dict[str, Any] | None = None


class ConservationStatus(BaseModel):
    iucn_status: str | None = None
    iucn_trend: str | None = None
    national_status: str = "Non Protected"


class EcologicalTraits(BaseModel):
    guild: str | None = None
    ecosystem_service: str | None = None
    habitat: str | None = None
    typology: str | None = None
    endemism: str | None = None
    potential_threats: str | None = None
    reference: str | None = None


class SpeciesLookupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scientific_name: str


class SpeciesDraft(BaseModel):
    scientific_name: str
    taxonomy: Taxonomy
    conservation: ConservationStatus
    traits: EcologicalTraits
    field_sources: dict[str, Any]


class SpeciesCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scientific_name: str
    kingdom: str | None = None
    class_name: str | None = None
    order_name: str | None = None
    family: str | None = None
    genus: str | None = None
    species_epithet: str | None = None
    common_name: str | None = None
    raw_taxonomy_extra: dict[str, Any] | None = None
    field_sources: dict[str, Any] | None = None
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
    updated_at: str  # optimistic concurrency token


class SpeciesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
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
    updated_at: datetime


class ValidationHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    species_id: int
    action: str
    changed_fields: dict[str, Any]
    validated_by: int
    validated_at: datetime


class SiteSpeciesCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    species_id: int
    notes: str | None = None


class SiteSpeciesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    site_id: int
    species_id: int
    recorded_by: int
    notes: str | None
