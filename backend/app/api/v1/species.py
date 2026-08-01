from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.species import Species
from app.models.user import User
from app.repositories.species_repository import SpeciesRepository
from app.schemas.species import (
    SiteSpeciesCreate,
    SiteSpeciesRead,
    SpeciesCreate,
    SpeciesDraft,
    SpeciesLookupRequest,
    SpeciesRead,
    SpeciesUpdate,
)
from app.services.species_lookup_service import SpeciesLookupService
from app.services.species_validation_service import SpeciesValidationService

router = APIRouter(tags=["species"])


def _get_species_or_404(species_id: int, db: Session) -> Species:
    species = SpeciesRepository(db).get_by_id(species_id)
    if species is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Species not found")
    return species


# --- Draft stage: nothing persisted ---

@router.get("/species/check", response_model=SpeciesRead | None)
def check_duplicate(
    scientific_name: str = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Species | None:
    """Case-insensitive existence check, per the duplicate-handling workflow (Section 12)."""
    return SpeciesValidationService(db).check_duplicate(scientific_name)


@router.post("/species/lookup", response_model=SpeciesDraft)
async def lookup_species(
    payload: SpeciesLookupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpeciesDraft:
    """Queries external providers and returns a draft. Persists nothing to `species`."""
    return await SpeciesLookupService(db).lookup(payload.scientific_name, requested_by=current_user.id)


# --- Persisted species records ---

@router.get("/species", response_model=list[SpeciesRead])
def list_species(
    status_filter: str | None = Query(default=None, alias="status"),
    family: str | None = Query(default=None),
    national_status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Species]:
    return SpeciesRepository(db).list_species(
        status=status_filter, family=family, national_status=national_status, limit=limit, offset=offset
    )


@router.get("/species/{species_id}", response_model=SpeciesRead)
def get_species(species_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Species:
    return _get_species_or_404(species_id, db)


@router.get("/species/{species_id}/history")
def get_species_history(species_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    _get_species_or_404(species_id, db)
    return SpeciesRepository(db).get_history(species_id)


@router.post("/species", response_model=SpeciesRead, status_code=status.HTTP_201_CREATED)
def create_species(
    payload: SpeciesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Species:
    """Creates + validates a species record and links it to a site in one call.
    Raises 409 (via the global handler) if scientific_name already exists.
    """
    return SpeciesValidationService(db).validate_and_save(payload, user_id=current_user.id)


@router.patch("/species/{species_id}", response_model=SpeciesRead)
def update_species(
    species_id: int,
    payload: SpeciesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Species:
    species = _get_species_or_404(species_id, db)
    return SpeciesValidationService(db).update_and_revalidate(species, payload, user_id=current_user.id)


# --- Site <-> Species associations ---

@router.post("/sites/{site_id}/species", response_model=SiteSpeciesRead, status_code=status.HTTP_201_CREATED)
def associate_species_with_site(
    site_id: int,
    payload: SiteSpeciesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_species_or_404(payload.species_id, db)
    return SpeciesValidationService(db).associate_with_site(
        species_id=payload.species_id, site_id=site_id, user_id=current_user.id, notes=payload.notes
    )


@router.get("/sites/{site_id}/species", response_model=list[SiteSpeciesRead])
def list_species_for_site(site_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return SpeciesRepository(db).list_species_for_site(site_id)


@router.delete("/sites/{site_id}/species/{species_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_species_from_site(
    site_id: int, species_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> None:
    repo = SpeciesRepository(db)
    association = repo.get_association(site_id=site_id, species_id=species_id)
    if association is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Association not found")
    repo.delete_association(association)
