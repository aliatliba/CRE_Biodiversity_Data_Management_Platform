from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime, timedelta, timezone

from app.core.dependencies import DBSession, CurrentUser
from app.models.species import Species
from app.models.site import Site
from app.models.site_species import SiteSpecies
from app.models.validation_history import SpeciesValidationHistory

router = APIRouter()


def _taxonomy_incomplete_filter():
    return or_(
        Species.kingdom.is_(None),
        Species.kingdom == "",
        Species.class_name.is_(None),
        Species.class_name == "",
        Species.order_name.is_(None),
        Species.order_name == "",
        Species.family.is_(None),
        Species.family == "",
        Species.genus.is_(None),
        Species.genus == "",
    )


def _taxonomy_complete_filter():
    return ~_taxonomy_incomplete_filter()


def _conservation_missing_filter():
    return or_(Species.iucn_status.is_(None), Species.iucn_status == "")


def _species_query_for_scope(db: Session, site_id: int | None):
    query = db.query(Species)
    if site_id is not None:
        query = query.join(SiteSpecies, SiteSpecies.species_id == Species.id).filter(
            SiteSpecies.site_id == site_id
        )
    return query


@router.get("/stats")
def dashboard_stats(
    db: DBSession,
    user: CurrentUser,
    site_id: int | None = Query(None),
):
    if site_id is not None:
        site = db.query(Site).filter(Site.id == site_id).first()
        if not site:
            raise HTTPException(status_code=404, detail="Site not found")

    species_query = _species_query_for_scope(db, site_id)

    total_species = species_query.count()
    total_sites = 1 if site_id is not None else db.query(Site).count()

    if site_id is not None:
        total_associations = (
            db.query(SiteSpecies).filter(SiteSpecies.site_id == site_id).count()
        )
    else:
        total_associations = db.query(SiteSpecies).count()

    status_counts = (
        species_query.with_entities(Species.national_status, func.count(Species.id))
        .group_by(Species.national_status)
        .all()
    )
    status_breakdown = {s or "Unknown": c for s, c in status_counts}

    iucn_counts = (
        species_query.with_entities(Species.iucn_status, func.count(Species.id))
        .group_by(Species.iucn_status)
        .all()
    )
    iucn_breakdown = {(s or "Unknown"): c for s, c in iucn_counts}

    family_counts = (
        species_query.with_entities(Species.family, func.count(Species.id))
        .filter(Species.family.isnot(None), Species.family != "")
        .group_by(Species.family)
        .order_by(func.count(Species.id).desc())
        .limit(10)
        .all()
    )
    top_families = [{"family": f, "count": c} for f, c in family_counts]

    missing_taxonomy = species_query.filter(_taxonomy_incomplete_filter()).count()
    missing_conservation = (
        species_query.filter(
            _taxonomy_complete_filter(), _conservation_missing_filter()
        ).count()
    )
    complete_records = (
        species_query.filter(
            _taxonomy_complete_filter(),
            Species.iucn_status.isnot(None),
            Species.iucn_status != "",
        ).count()
    )

    completeness_breakdown = {
        "complete": complete_records,
        "missing_taxonomy": missing_taxonomy,
        "missing_conservation": missing_conservation,
    }

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    if site_id is not None:
        site_species_ids = (
            db.query(SiteSpecies.species_id)
            .filter(SiteSpecies.site_id == site_id)
            .subquery()
        )
        validations_last_30 = (
            db.query(SpeciesValidationHistory)
            .filter(
                SpeciesValidationHistory.validated_at >= thirty_days_ago,
                SpeciesValidationHistory.species_id.in_(site_species_ids),
            )
            .count()
        )
    else:
        validations_last_30 = (
            db.query(SpeciesValidationHistory)
            .filter(SpeciesValidationHistory.validated_at >= thirty_days_ago)
            .count()
        )

    site_stats = []
    if site_id is None:
        sites = db.query(Site).order_by(Site.name.asc()).all()
        for site in sites:
            site_species_query = (
                db.query(Species)
                .join(SiteSpecies, SiteSpecies.species_id == Species.id)
                .filter(SiteSpecies.site_id == site.id)
            )
            count = site_species_query.count()
            protected = site_species_query.filter(
                Species.national_status == "Protected"
            ).count()
            complete = site_species_query.filter(
                _taxonomy_complete_filter(),
                Species.iucn_status.isnot(None),
                Species.iucn_status != "",
            ).count()
            site_stats.append(
                {
                    "site_id": site.id,
                    "site_name": site.name,
                    "species_count": count,
                    "protected_count": protected,
                    "complete_count": complete,
                    "incomplete_count": count - complete,
                }
            )

    result = {
        "total_species": total_species,
        "total_sites": total_sites,
        "total_associations": total_associations,
        "status_breakdown": status_breakdown,
        "iucn_breakdown": iucn_breakdown,
        "top_families": top_families,
        "completeness_breakdown": completeness_breakdown,
        "validations_last_30_days": validations_last_30,
        "site_stats": site_stats,
    }

    if site_id is not None:
        site = db.query(Site).filter(Site.id == site_id).first()
        result["site"] = {
            "id": site.id,
            "name": site.name,
            "code": site.code,
        }

    return result
