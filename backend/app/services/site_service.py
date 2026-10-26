from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.site import Site
from app.models.site_species import SiteSpecies
from app.models.species import Species, escape_like
from app.schemas.site import SiteCreate, SiteUpdate
from app.services.dashboard_service import THREATENED_STATUSES, _taxonomy_complete_filter


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


def list_sites(db: Session, search: str | None = None) -> list[dict]:
    """Sites (alphabetical) with their species counters, in one grouped query.

    ``species_share`` is the site's percentage of all site-species records, across
    every site (not only those matching ``search``), so it reads the same either way.
    """
    has_iucn = Species.iucn_status.isnot(None) & (Species.iucn_status != "")
    query = (
        db.query(
            Site,
            func.count(Species.id),
            func.count(Species.id).filter(Species.national_status == "Protected"),
            func.count(Species.id).filter(Species.iucn_status.in_(THREATENED_STATUSES)),
            func.count(Species.id).filter(_taxonomy_complete_filter() & has_iucn),
        )
        .outerjoin(SiteSpecies, SiteSpecies.site_id == Site.id)
        .outerjoin(Species, Species.id == SiteSpecies.species_id)
        .group_by(Site.id)
    )
    if search:
        query = query.filter(Site.name.ilike(f"%{escape_like(search)}%", escape="\\"))
    rows = query.order_by(Site.name).all()

    total_records = db.query(func.count(SiteSpecies.id)).scalar() or 0
    return [
        {
            "id": site.id,
            "name": site.name,
            "code": site.code,
            "description": site.description,
            "created_by": site.created_by,
            "species_count": count,
            "species_share": round(count / total_records * 100, 1) if total_records else 0.0,
            "protected_count": protected,
            "threatened_count": threatened,
            "complete_count": complete,
        }
        for site, count, protected, threatened, complete in rows
    ]


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
