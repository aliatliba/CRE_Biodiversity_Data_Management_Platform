from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
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
        raise NotFoundError("Site not found")
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
    associations = db.query(SiteSpecies).filter(SiteSpecies.site_id == site_id)
    if not force and associations.first() is not None:
        raise ConflictError("Site has species associations. Use force=true to delete anyway.")
    # Single transaction: remove the association rows first (site_species.site_id
    # has no ON DELETE CASCADE), then the site itself.
    try:
        associations.delete(synchronize_session=False)
        db.delete(site)
        db.commit()
    except Exception:
        db.rollback()
        raise
