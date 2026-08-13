from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.site import Site
from app.models.site_species import SiteSpecies
from app.schemas.site import SiteCreate, SiteUpdate


def create_site(db: Session, data: SiteCreate, user_id: int) -> Site:
    site = Site(
        name=data.name,
        code=data.code,
        description=data.description,
        created_by=user_id,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


def get_site(db: Session, site_id: int) -> Site:
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site


def list_sites(db: Session, search: str | None = None) -> list[Site]:
    query = db.query(Site)
    if search:
        query = query.filter(Site.name.ilike(f"%{search}%"))
    return query.order_by(Site.name).all()


def update_site(db: Session, site_id: int, data: SiteUpdate) -> Site:
    site = get_site(db, site_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(site, field, value)
    db.commit()
    db.refresh(site)
    return site


def delete_site(db: Session, site_id: int, force: bool = False) -> None:
    site = get_site(db, site_id)
    has_associations = db.query(SiteSpecies).filter(SiteSpecies.site_id == site_id).first()
    if has_associations and not force:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Site has species associations. Use force=true to delete anyway.",
        )
    db.delete(site)
    db.commit()
