from fastapi import APIRouter, Query
from typing import List

from app.core.dependencies import DBSession, CurrentUser, AdminUser
from app.schemas.protected_species import ProtectedSpeciesCreate, ProtectedSpeciesResponse
from app.services import protected_species_service

router = APIRouter()


@router.get("", response_model=List[ProtectedSpeciesResponse])
def list_protected_species(
    db: DBSession,
    user: CurrentUser,
    search: str | None = Query(None),
):
    """Any active user can view the list — it's reference data used while
    logging species, not something only admins need to see."""
    return protected_species_service.list_protected_species(db, search)


@router.post("", response_model=ProtectedSpeciesResponse, status_code=201)
def add_protected_species(data: ProtectedSpeciesCreate, db: DBSession, admin: AdminUser):
    return protected_species_service.add_protected_species(db, data, admin.id)


@router.delete("/{entry_id}")
def remove_protected_species(entry_id: int, db: DBSession, admin: AdminUser):
    protected_species_service.remove_protected_species(db, entry_id)
    return {"detail": "Removed from protected list"}
