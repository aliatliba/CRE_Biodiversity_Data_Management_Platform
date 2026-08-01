from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, require_role
from app.dependencies.db import get_db
from app.models.site import Site
from app.models.user import User
from app.schemas.site import SiteCreate, SiteRead, SiteUpdate
from app.services.site_service import SiteService

router = APIRouter(prefix="/sites", tags=["sites"])


def _get_site_or_404(site_id: int, db: Session) -> Site:
    site = SiteService(db).get(site_id)
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site


@router.get("", response_model=list[SiteRead])
def search_sites(
    q: str | None = Query(default=None, description="Case-insensitive, partial-match search"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Site]:
    """Backs the searchable site dropdown described in the workflow (Section 3/11)."""
    return SiteService(db).search(query=q, limit=limit, offset=offset)


@router.get("/{site_id}", response_model=SiteRead)
def get_site(site_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Site:
    return _get_site_or_404(site_id, db)


@router.post("", response_model=SiteRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_role("admin"))])
def create_site(payload: SiteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Site:
    return SiteService(db).create(payload, created_by=current_user.id)


@router.patch("/{site_id}", response_model=SiteRead, dependencies=[Depends(require_role("admin"))])
def update_site(site_id: int, payload: SiteUpdate, db: Session = Depends(get_db)) -> Site:
    site = _get_site_or_404(site_id, db)
    return SiteService(db).update(site, payload)


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role("admin"))])
def delete_site(site_id: int, db: Session = Depends(get_db)) -> None:
    site = _get_site_or_404(site_id, db)
    SiteService(db).delete(site)
