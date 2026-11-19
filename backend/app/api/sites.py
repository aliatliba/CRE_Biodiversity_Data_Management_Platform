from typing import List

from fastapi import APIRouter, Query, Response

from app.core.dependencies import ActiveUser, AdminUser, DBSession
from app.schemas.site import (
    DesignationResponse,
    SiteCreate,
    SiteDesignationCreate,
    SiteListItem,
    SiteResponse,
    SiteUpdate,
)
from app.schemas.species import SiteSpeciesCreate, SiteSpeciesResponse
from app.services import site_service, species_service

router = APIRouter()


@router.get("", response_model=List[SiteListItem])
def list_sites(
    db: DBSession,
    user: ActiveUser,
    search: str | None = Query(None, max_length=255),
):
    return site_service.list_sites(db, search)


@router.post("", response_model=SiteResponse, status_code=201)
def create_site(data: SiteCreate, db: DBSession, admin: AdminUser):
    return site_service.create_site(db, data, admin.id)


@router.get("/{site_id}", response_model=SiteResponse)
def get_site(site_id: int, db: DBSession, user: ActiveUser):
    return site_service.get_site(db, site_id)


@router.patch("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: int, data: SiteUpdate, db: DBSession, admin: AdminUser
):
    return site_service.update_site(db, site_id, data)


@router.delete("/{site_id}")
def delete_site(
    site_id: int,
    db: DBSession,
    admin: AdminUser,
    force: bool = False,
):
    site_service.delete_site(db, site_id, force)
    return {"detail": "Site deleted"}


@router.post("/{site_id}/species", response_model=SiteSpeciesResponse, status_code=201)
def associate_species(
    site_id: int,
    data: SiteSpeciesCreate,
    db: DBSession,
    user: ActiveUser,
):
    return species_service.associate_species_with_site(db, site_id, data, user.id)


@router.get("/{site_id}/species", response_model=List[SiteSpeciesResponse])
def list_site_species(site_id: int, db: DBSession, user: ActiveUser):
    return species_service.list_species_for_site(db, site_id)


@router.delete("/{site_id}/species/{species_id}")
def remove_site_species(site_id: int, species_id: int, db: DBSession, user: ActiveUser):
    species_service.remove_site_species(db, site_id, species_id, user)
    return {"detail": "Species removed from site"}


@router.post(
    "/{site_id}/designations",
    response_model=List[DesignationResponse],
    status_code=201,
    responses={200: {"description": "The site already had this designation"}},
)
def add_site_designation(
    site_id: int,
    data: SiteDesignationCreate,
    response: Response,
    db: DBSession,
    admin: AdminUser,
):
    """Admin only. Returns the site's designations; 201 when added, 200 when the
    site already had it (idempotent)."""
    site, created = site_service.add_designation(db, site_id, data.designation_id, admin.id)
    if not created:
        response.status_code = 200
    return site.designations


@router.delete("/{site_id}/designations/{designation_id}", status_code=204)
def remove_site_designation(
    site_id: int, designation_id: str, db: DBSession, admin: AdminUser
):
    """Admin only. Idempotent: 204 whether or not the site had the designation."""
    site_service.remove_designation(db, site_id, designation_id, admin.id)
    return Response(status_code=204)
