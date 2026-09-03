import asyncio
from datetime import datetime, timezone
from typing import Any

from app.models.user import User

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.species import Species
from app.models.site_species import SiteSpecies
from app.models.validation_history import SpeciesValidationHistory
from app.models.protected_species import ProtectedSpeciesList
from app.schemas.species import (
    SpeciesCreate,
    SpeciesUpdate,
    SiteSpeciesCreate,
)
from app.integrations.base import ProviderResult
from app.integrations.wikidata_client import WikidataClient
from app.integrations.gbif_client import GbifClient
from app.integrations.iucn_client import IucnClient
from app.integrations.powo_client import PowoClient
from app.integrations.inaturalist_client import InaturalistClient
from app.integrations.mapper import normalize_provider_result

PERMITTED_EDIT_FIELDS = {
    # Taxonomy
    "kingdom",
    "class_name",
    "order_name",
    "family",
    "genus",
    "species_epithet",
    "common_name",
    # Conservation & ecological traits
    "guild",
    "ecosystem_service",
    "habitat",
    "typology",
    "endemism",
    "potential_threats",
    "reference",
    "iucn_status",
    "iucn_trend",
}


async def lookup_species(db: Session, scientific_name: str) -> dict[str, Any]:
    gbif_result = await GbifClient().search(scientific_name)
    resolved_name = gbif_result.data.get("canonicalName") or scientific_name
    is_synonym = "_resolved_from_synonym" in gbif_result.data

    other_clients = [WikidataClient(), IucnClient(), PowoClient(), InaturalistClient()]
    other_results = await asyncio.gather(
        *[c.search(resolved_name) for c in other_clients],
        return_exceptions=True,
    )

    merged: dict[str, Any] = {
        "scientific_name": resolved_name,
        "input_scientific_name": scientific_name if is_synonym else None,
        "taxonomy": {},
        "conservation": {},
        "traits": {},
        "field_sources": {},
        # Surface protection status immediately in lookup results, so a
        # researcher sees it before saving the record, not after.
        "national_status": compute_national_status(db, resolved_name),
    }

    _merge_into_draft(merged, normalize_provider_result(gbif_result, "GbifClient"))
    for client, result in zip(other_clients, other_results):
        if isinstance(result, Exception):
            continue
        _merge_into_draft(merged, normalize_provider_result(result, client.__class__.__name__))

    return merged


def _merge_into_draft(merged: dict[str, Any], normalized: dict[str, Any]) -> None:
    for section in ("taxonomy", "conservation", "traits"):
        for key, value in normalized.get(section, {}).items():
            if value is not None and merged[section].get(key) is None:
                merged[section][key] = value
                merged["field_sources"][key] = normalized.get("field_sources", {}).get(key)


def check_duplicate(db: Session, scientific_name: str) -> Species | None:
    return (
        db.query(Species)
        .filter(func.lower(Species.scientific_name) == func.lower(scientific_name))
        .first()
    )


def compute_national_status(db: Session, scientific_name: str) -> str:
    protected = (
        db.query(ProtectedSpeciesList)
        .filter(
            func.lower(ProtectedSpeciesList.scientific_name) == func.lower(scientific_name)
        )
        .first()
    )
    return "Protected" if protected else "Non Protected"


def create_species(db: Session, data: SpeciesCreate, user_id: int) -> Species:
    existing = check_duplicate(db, data.scientific_name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Species already exists",
        )

    national_status = compute_national_status(db, data.scientific_name)

    species = Species(
        scientific_name=data.scientific_name,
        kingdom=data.kingdom,
        class_name=data.class_name,
        order_name=data.order_name,
        family=data.family,
        genus=data.genus,
        species_epithet=data.species_epithet,
        common_name=data.common_name,
        raw_taxonomy_extra=data.raw_taxonomy_extra,
        field_sources=data.field_sources,
        iucn_status=data.iucn_status,
        iucn_trend=data.iucn_trend,
        national_status=national_status,
        guild=data.guild,
        ecosystem_service=data.ecosystem_service,
        habitat=data.habitat,
        typology=data.typology,
        endemism=data.endemism,
        potential_threats=data.potential_threats,
        reference=data.reference,
        status="validated",
        created_by=user_id,
        validated_by=user_id,
        validated_at=datetime.now(timezone.utc),
    )
    db.add(species)
    db.flush()

    history = SpeciesValidationHistory(
        species_id=species.id,
        action="created",
        changed_fields={},
        validated_by=user_id,
    )
    db.add(history)

    association = SiteSpecies(
        site_id=data.site_id,
        species_id=species.id,
        recorded_by=user_id,
    )
    db.add(association)

    db.commit()
    db.refresh(species)
    return species


def update_species(db: Session, species_id: int, data: SpeciesUpdate, user_id: int) -> Species:
    species = db.query(Species).filter(Species.id == species_id).first()
    if not species:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Species not found",
        )

    incoming_updated_at = datetime.fromisoformat(data.updated_at.replace("Z", "+00:00"))
    if species.updated_at.replace(tzinfo=timezone.utc) != incoming_updated_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Species was modified by another user. Please refresh and try again.",
        )

    changes: dict[str, Any] = {}
    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("updated_at", None)

    for field, new_value in update_data.items():
        if field not in PERMITTED_EDIT_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Field '{field}' is not permitted to be edited on an existing species.",
            )
        old_value = getattr(species, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
            setattr(species, field, new_value)

    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes detected",
        )

    species.validated_by = user_id
    species.validated_at = datetime.now(timezone.utc)
    species.updated_at = datetime.now(timezone.utc)

    history = SpeciesValidationHistory(
        species_id=species.id,
        action="updated",
        changed_fields=changes,
        validated_by=user_id,
    )
    db.add(history)
    db.commit()
    db.refresh(species)
    return species


def get_species(db: Session, species_id: int) -> Species:
    species = db.query(Species).filter(Species.id == species_id).first()
    if not species:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Species not found",
        )
    return species


CRITICAL_TAXONOMY_FIELDS = ("kingdom", "class_name", "order_name", "family", "genus")


def _apply_species_filters(
    query,
    *,
    status: str | None = None,
    search: str | None = None,
    kingdom: str | None = None,
    class_name: str | None = None,
    order_name: str | None = None,
    family: str | None = None,
    genus: str | None = None,
    national_status: str | None = None,
    site_id: int | None = None,
):
    if site_id is not None:
        query = query.join(SiteSpecies, SiteSpecies.species_id == Species.id).filter(
            SiteSpecies.site_id == site_id
        )
    if status:
        query = query.filter(Species.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Species.scientific_name.ilike(pattern))
            | (Species.common_name.ilike(pattern))
        )
    if kingdom:
        query = query.filter(Species.kingdom.ilike(f"%{kingdom}%"))
    if class_name:
        query = query.filter(Species.class_name.ilike(f"%{class_name}%"))
    if order_name:
        query = query.filter(Species.order_name.ilike(f"%{order_name}%"))
    if family:
        query = query.filter(Species.family.ilike(f"%{family}%"))
    if genus:
        query = query.filter(Species.genus.ilike(f"%{genus}%"))
    if national_status:
        query = query.filter(Species.national_status == national_status)
    return query


def list_species(
    db: Session,
    status: str | None = None,
    search: str | None = None,
    kingdom: str | None = None,
    class_name: str | None = None,
    order_name: str | None = None,
    family: str | None = None,
    genus: str | None = None,
    national_status: str | None = None,
    site_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Species], int]:
    query = db.query(Species)
    query = _apply_species_filters(
        query,
        status=status,
        search=search,
        kingdom=kingdom,
        class_name=class_name,
        order_name=order_name,
        family=family,
        genus=genus,
        national_status=national_status,
        site_id=site_id,
    )
    total = query.count()
    items = (
        query.order_by(Species.scientific_name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def delete_species(db: Session, species_id: int) -> None:
    species = db.query(Species).filter(Species.id == species_id).first()
    if not species:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Species not found",
        )
    db.query(SiteSpecies).filter(SiteSpecies.species_id == species_id).delete(
        synchronize_session=False
    )
    db.query(SpeciesValidationHistory).filter(
        SpeciesValidationHistory.species_id == species_id
    ).delete(synchronize_session=False)
    db.delete(species)
    db.commit()


def get_species_history(db: Session, species_id: int) -> list[SpeciesValidationHistory]:
    return (
        db.query(SpeciesValidationHistory)
        .filter(SpeciesValidationHistory.species_id == species_id)
        .order_by(SpeciesValidationHistory.validated_at.desc())
        .all()
    )


def associate_species_with_site(
    db: Session, site_id: int, data: SiteSpeciesCreate, user_id: int
) -> SiteSpecies:
    existing = (
        db.query(SiteSpecies)
        .filter(SiteSpecies.site_id == site_id, SiteSpecies.species_id == data.species_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Species is already associated with this site",
        )
    association = SiteSpecies(
        site_id=site_id,
        species_id=data.species_id,
        recorded_by=user_id,
        notes=data.notes,
    )
    db.add(association)
    db.commit()
    db.refresh(association)
    return association


def list_species_for_site(db: Session, site_id: int) -> list[SiteSpecies]:
    return db.query(SiteSpecies).filter(SiteSpecies.site_id == site_id).all()


def remove_site_species(db: Session, site_id: int, species_id: int) -> None:
    association = (
        db.query(SiteSpecies)
        .filter(SiteSpecies.site_id == site_id, SiteSpecies.species_id == species_id)
        .first()
    )
    if not association:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Association not found",
        )
    db.delete(association)
    db.commit()
