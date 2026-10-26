from fastapi import APIRouter, Query

from app.core.dependencies import AdminUser, CurrentUser, DBSession
from app.core.pagination import Page, PaginationParams, paginate
from app.schemas.protected_species import (
    ProtectedSpeciesCreate,
    ProtectedSpeciesListItem,
    ProtectedSpeciesResponse,
)
from app.services import protected_species_service

router = APIRouter()


@router.get("", response_model=Page[ProtectedSpeciesListItem])
def list_protected_species(
    db: DBSession,
    user: CurrentUser,
    search: str | None = Query(None, max_length=255),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    """Any active user can view the list — it's reference data used while
    logging species, not something only admins need to see."""
    items, total = protected_species_service.list_protected_species(
        db, search, page=page, page_size=page_size
    )
    return paginate(items, total, PaginationParams(page=page, page_size=page_size))


@router.post("", response_model=ProtectedSpeciesResponse, status_code=201)
def add_protected_species(data: ProtectedSpeciesCreate, db: DBSession, admin: AdminUser):
    return protected_species_service.add_protected_species(db, data, admin.id)


@router.delete("/{entry_id}")
def remove_protected_species(entry_id: int, db: DBSession, admin: AdminUser):
    protected_species_service.remove_protected_species(db, entry_id)
    return {"detail": "Removed from protected list"}
