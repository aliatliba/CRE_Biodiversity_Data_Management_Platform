from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import DBSession, CurrentUser
from app.schemas.species import (
    SpeciesCreate,
    SpeciesUpdate,
    SpeciesResponse,
    SpeciesLookupRequest,
    SiteSpeciesCreate,
    SiteSpeciesResponse,
    ValidationHistoryResponse,
)
from app.services import species_service
from app.core.pagination import PaginationParams, paginate,Page

router = APIRouter()


@router.get("/check")
def check_species(scientific_name: str, db: DBSession):
    existing = species_service.check_duplicate(db, scientific_name)
    if existing:
        return {"exists": True, "species": existing}
    return {"exists": False}


@router.post("/lookup")
async def lookup_species(data: SpeciesLookupRequest):
    draft = await species_service.lookup_species(data.scientific_name)
    return draft


@router.get("", response_model=Page[SpeciesResponse])
def list_species(
    db: DBSession,
    user: CurrentUser,
    status: str | None = Query(None),
    family: str | None = Query(None),
    national_status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    params = PaginationParams(page=page, page_size=page_size)
    items, total = species_service.list_species(db, status, family, national_status, page, page_size)
    return paginate(items, total, params)


@router.get("/{species_id}", response_model=SpeciesResponse)
def get_species(species_id: int, db: DBSession, user: CurrentUser):
    return species_service.get_species(db, species_id)


@router.get("/{species_id}/history", response_model=List[ValidationHistoryResponse])
def get_species_history(species_id: int, db: DBSession, user: CurrentUser):
    return species_service.get_species_history(db, species_id)


@router.post("", response_model=SpeciesResponse, status_code=201)
def create_species(
    data: SpeciesCreate, db: DBSession, user: CurrentUser
):
    return species_service.create_species(db, data, user.id)


@router.patch("/{species_id}", response_model=SpeciesResponse)
def update_species(
    species_id: int,
    data: SpeciesUpdate,
    db: DBSession,
    user: CurrentUser,
):
    return species_service.update_species(db, species_id, data, user.id)


@router.post("/{site_id}/species", response_model=SiteSpeciesResponse, status_code=201)
def associate_species(
    site_id: int,
    data: SiteSpeciesCreate,
    db: DBSession,
    user: CurrentUser,
):
    return species_service.associate_species_with_site(db, site_id, data, user.id)


@router.get("/{site_id}/species", response_model=List[SiteSpeciesResponse])
def list_site_species(site_id: int, db: DBSession, user: CurrentUser):
    return species_service.list_species_for_site(db, site_id)


@router.delete("/{site_id}/species/{species_id}")
def remove_site_species(
    site_id: int, species_id: int, db: DBSession, user: CurrentUser
):
    species_service.remove_site_species(db, site_id, species_id)
    return {"detail": "Association removed"}
