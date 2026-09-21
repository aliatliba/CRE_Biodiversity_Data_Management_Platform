from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime, timedelta, timezone

from app.core.dependencies import DBSession, ActiveUser
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
    return or_(
        Species.iucn_status.is_(None),
        Species.iucn_status == "",
    )


def _species_query_for_scope(db: Session, site_id: int | None):
    query = db.query(Species)

    if site_id is not None:
        query = query.join(
            SiteSpecies,
            SiteSpecies.species_id == Species.id,
        ).filter(
            SiteSpecies.site_id == site_id
        )

    return query


def _biodiversity_composition(species_query):
    """
    Derive the three dashboard biodiversity groups from taxonomy.

    Animalia -> Fauna
    Plantae -> Flora
    Other kingdoms -> Micro-organisms
    """

    kingdom_counts = (
        species_query
        .with_entities(
            Species.kingdom,
            func.count(Species.id),
        )
        .group_by(Species.kingdom)
        .all()
    )

    composition = {
        "Fauna": 0,
        "Flora": 0,
        "Micro-organisms": 0,
    }

    for kingdom, count in kingdom_counts:
        normalized = (kingdom or "").strip().lower()

        if normalized == "animalia":
            composition["Fauna"] += count
        elif normalized == "plantae":
            composition["Flora"] += count
        else:
            composition["Micro-organisms"] += count

    return composition


@router.get("/stats")
def dashboard_stats(
    db: DBSession,
    user: ActiveUser,
    site_id: int | None = Query(None),
):
    if site_id is not None:
        site = db.query(Site).filter(Site.id == site_id).first()

        if not site:
            raise HTTPException(
                status_code=404,
                detail="Site not found",
            )

    species_query = _species_query_for_scope(db, site_id)

    # ------------------------------------------------------------------
    # Summary statistics
    # ------------------------------------------------------------------

    total_species = species_query.count()

    total_sites = (
        1
        if site_id is not None
        else db.query(Site).count()
    )

    # ------------------------------------------------------------------
    # IUCN status
    # ------------------------------------------------------------------

    iucn_counts = (
        species_query
        .with_entities(
            Species.iucn_status,
            func.count(Species.id),
        )
        .group_by(Species.iucn_status)
        .all()
    )

    iucn_breakdown = {
        status or "Unknown": count
        for status, count in iucn_counts
    }

    threatened_statuses = {"CR", "EN", "VU"}

    iucn_threatened_species = sum(
        count
        for status, count in iucn_breakdown.items()
        if status in threatened_statuses
    )


    family_counts = (
        species_query
        .with_entities(
            Species.family,
            func.count(Species.id),
        )
        .filter(
            Species.family.isnot(None),
            Species.family != "",
        )
        .group_by(Species.family)
        .order_by(func.count(Species.id).desc())
        .limit(10)
        .all()
    )

    top_families = [
        {
            "family": family,
            "count": count,
        }
        for family, count in family_counts
    ]
    # ------------------------------------------------------------------
    # National status
    # ------------------------------------------------------------------

    status_counts = (
        species_query
        .with_entities(
            Species.national_status,
            func.count(Species.id),
        )
        .group_by(Species.national_status)
        .all()
    )

    status_breakdown = {
        status or "Unknown": count
        for status, count in status_counts
    }

    # ------------------------------------------------------------------
    # Biodiversity composition
    # ------------------------------------------------------------------

    biodiversity_composition = _biodiversity_composition(
        species_query
    )

    # ------------------------------------------------------------------
    # Existing association count
    # Kept in the API for compatibility even though it is no longer
    # displayed on the dashboard.
    # ------------------------------------------------------------------

    if site_id is not None:
        total_associations = (
            db.query(SiteSpecies)
            .filter(SiteSpecies.site_id == site_id)
            .count()
        )
    else:
        total_associations = db.query(SiteSpecies).count()

    # ------------------------------------------------------------------
    # Existing completeness statistics
    # Kept in the API for compatibility even though the dashboard no
    # longer displays the completeness cards/chart.
    # ------------------------------------------------------------------

    missing_taxonomy = species_query.filter(
        _taxonomy_incomplete_filter()
    ).count()

    missing_conservation = (
        species_query
        .filter(
            _taxonomy_complete_filter(),
            _conservation_missing_filter(),
        )
        .count()
    )

    complete_records = (
        species_query
        .filter(
            _taxonomy_complete_filter(),
            Species.iucn_status.isnot(None),
            Species.iucn_status != "",
        )
        .count()
    )

    completeness_breakdown = {
        "complete": complete_records,
        "missing_taxonomy": missing_taxonomy,
        "missing_conservation": missing_conservation,
    }

    # ------------------------------------------------------------------
    # Existing validation statistic
    # Kept in the API for compatibility.
    # ------------------------------------------------------------------

    thirty_days_ago = (
        datetime.now(timezone.utc)
        - timedelta(days=30)
    )

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
                SpeciesValidationHistory.species_id.in_(
                    site_species_ids
                ),
            )
            .count()
        )
    else:
        validations_last_30 = (
            db.query(SpeciesValidationHistory)
            .filter(
                SpeciesValidationHistory.validated_at
                >= thirty_days_ago
            )
            .count()
        )

    # ------------------------------------------------------------------
    # Per-site statistics
    # ------------------------------------------------------------------

    site_stats = []

    if site_id is None:
        sites = (
            db.query(Site)
            .order_by(Site.name.asc())
            .all()
        )

        for site in sites:
            site_species_query = (
                db.query(Species)
                .join(
                    SiteSpecies,
                    SiteSpecies.species_id == Species.id,
                )
                .filter(
                    SiteSpecies.site_id == site.id
                )
            )

            count = site_species_query.count()

            protected = (
                site_species_query
                .filter(
                    Species.national_status == "Protected"
                )
                .count()
            )

            complete = (
                site_species_query
                .filter(
                    _taxonomy_complete_filter(),
                    Species.iucn_status.isnot(None),
                    Species.iucn_status != "",
                )
                .count()
            )

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

    # ------------------------------------------------------------------
    # Species richness by site
    #
    # The percentage is based on the total number of species-site
    # associations. This means the bars are proportional to the actual
    # database distribution rather than hard-coded percentages.
    # ------------------------------------------------------------------

    total_site_species = sum(
        site["species_count"]
        for site in site_stats
    )

    species_richness_by_site = []

    for site in site_stats:
        percentage = (
            (site["species_count"] / total_site_species) * 100
            if total_site_species > 0
            else 0
        )

        species_richness_by_site.append(
            {
                "site_name": site["site_name"],
                "species_count": site["species_count"],
                "percentage": round(percentage, 1),
            }
        )

    # ------------------------------------------------------------------
    # Response
    # ------------------------------------------------------------------

    result = {
        "total_species": total_species,
        "total_sites": total_sites,

        "iucn_threatened_species": iucn_threatened_species,

        "biodiversity_composition": biodiversity_composition,

        "status_breakdown": status_breakdown,
        "iucn_breakdown": iucn_breakdown,

        "species_richness_by_site": species_richness_by_site,

        "site_stats": site_stats,
        "top_families": top_families,

        # Existing fields retained for API compatibility.
        "total_associations": total_associations,
        "completeness_breakdown": completeness_breakdown,
        "validations_last_30_days": validations_last_30,
    }

    if site_id is not None:
        site = (
            db.query(Site)
            .filter(Site.id == site_id)
            .first()
        )

        result["site"] = {
            "id": site.id,
            "name": site.name,
            "code": site.code,
        }

    return result