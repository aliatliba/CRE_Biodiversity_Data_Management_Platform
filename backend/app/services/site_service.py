from datetime import datetime, timezone

import structlog
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import designations as designation_catalog
from app.core.config import get_settings
from app.core.exceptions import AppException, BadRequestError, ConflictError, NotFoundError
from app.models.site import Site
from app.models.site_designation import SiteDesignation
from app.models.site_photo import SitePhoto
from app.models.site_species import SiteSpecies
from app.models.species import Species, escape_like
from app.schemas.site import SiteCreate, SiteUpdate
from app.services.dashboard_service import THREATENED_STATUSES, _taxonomy_complete_filter

logger = structlog.get_logger()


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
            "designations": site.designations,
            "photo_updated_at": site.photo_updated_at,
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


def _require_designation(designation_id: str) -> None:
    if designation_id not in designation_catalog.BY_ID:
        raise BadRequestError(f"Unknown designation: {designation_id}")


def _link(site: Site, designation_id: str) -> SiteDesignation | None:
    return next((x for x in site.designation_links if x.designation_id == designation_id), None)


def add_designation(
    db: Session, site_id: int, designation_id: str, user_id: int, url: str | None = None
) -> tuple[Site, bool]:
    """Give the site a designation. Idempotent: returns (site, created), where
    created is False when the site already had it (its link is then updated if a
    new one is given)."""
    _require_designation(designation_id)
    site = get_site(db, site_id)
    existing = _link(site, designation_id)
    if existing is not None:
        if url is not None and url != existing.url:
            existing.url = url
            db.commit()
            db.refresh(site)
        return site, False
    try:
        site.designation_links.append(
            SiteDesignation(designation_id=designation_id, url=url, created_by=user_id)
        )
        db.commit()
    except IntegrityError:
        # Added at the same moment by another request: same outcome.
        db.rollback()
        db.refresh(site)
        return site, False
    db.refresh(site)
    logger.info("site_designation_added", site_id=site_id, designation_id=designation_id, user_id=user_id)
    return site, True


def set_designation_url(
    db: Session, site_id: int, designation_id: str, url: str | None, user_id: int
) -> Site:
    """Set (or with None, remove) the site's link for a designation it has."""
    _require_designation(designation_id)
    site = get_site(db, site_id)
    link = _link(site, designation_id)
    if link is None:
        raise NotFoundError("This site does not have this designation")
    link.url = url
    db.commit()
    db.refresh(site)
    logger.info("site_designation_url_set", site_id=site_id, designation_id=designation_id, user_id=user_id)
    return site


def remove_designation(db: Session, site_id: int, designation_id: str, user_id: int) -> None:
    """Remove a designation from the site; nothing to do when the site does not have it."""
    _require_designation(designation_id)
    get_site(db, site_id)
    removed = (
        db.query(SiteDesignation)
        .filter(SiteDesignation.site_id == site_id, SiteDesignation.designation_id == designation_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    if removed:
        logger.info("site_designation_removed", site_id=site_id, designation_id=designation_id, user_id=user_id)


# ---------------------------------------------------------------------------
# Landscape photo
# ---------------------------------------------------------------------------


def sniff_image_type(data: bytes) -> str | None:
    """Media type of a JPEG / PNG / WebP image from its first bytes, else None.

    Decided from the content, never from the client's filename or Content-Type, so
    nothing but these three raster formats (no SVG, no HTML) is ever served back.
    """
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def set_photo(db: Session, site_id: int, data: bytes, user_id: int) -> Site:
    """Add or replace the site's photo."""
    max_bytes = get_settings().site_photo_max_bytes
    if len(data) > max_bytes:
        raise AppException(f"Photo is too large (max {max_bytes // (1024 * 1024)} MB)", 413)
    content_type = sniff_image_type(data)
    if content_type is None:
        raise BadRequestError("Photo must be a JPEG, PNG or WebP image")

    site = get_site(db, site_id)
    now = datetime.now(timezone.utc)
    values = {
        "content_type": content_type,
        "size_bytes": len(data),
        "data": data,
        "updated_at": now,
        "updated_by": user_id,
    }
    # One statement, so two uploads at the same moment cannot collide on the key.
    db.execute(
        insert(SitePhoto)
        .values(site_id=site_id, **values)
        .on_conflict_do_update(index_elements=[SitePhoto.site_id], set_=values)
    )
    site.photo_updated_at = now
    db.commit()
    db.refresh(site)
    logger.info("site_photo_set", site_id=site_id, size_bytes=len(data), user_id=user_id)
    return site


def get_photo(db: Session, site_id: int) -> SitePhoto:
    photo = db.get(SitePhoto, site_id)
    if photo is None:
        get_site(db, site_id)  # 404 "Site not found" when the site itself is unknown
        raise NotFoundError("This site has no photo")
    return photo


def remove_photo(db: Session, site_id: int, user_id: int) -> None:
    """Remove the site's photo; nothing to do when it has none."""
    site = get_site(db, site_id)
    removed = db.query(SitePhoto).filter(SitePhoto.site_id == site_id).delete(synchronize_session=False)
    site.photo_updated_at = None
    db.commit()
    if removed:
        logger.info("site_photo_removed", site_id=site_id, user_id=user_id)
