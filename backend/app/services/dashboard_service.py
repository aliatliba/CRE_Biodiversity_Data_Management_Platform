from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.site import Site
from app.models.site_species import SiteSpecies
from app.models.species import Species
from app.models.validation_history import SpeciesValidationHistory


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


# GBIF kingdom -> dashboard group. Chromista also holds large algae, but its members
# are overwhelmingly microscopic, so it is counted with the micro-organisms.
KINGDOM_GROUPS = {
    "animalia": "Fauna",
    "plantae": "Flora",
    "fungi": "Fungi",
    "bacteria": "Micro-organisms",
    "archaea": "Micro-organisms",
    "protozoa": "Micro-organisms",
    "chromista": "Micro-organisms",
    "viruses": "Micro-organisms",
}


def _biodiversity_composition(species_query):
    """Species per group (see KINGDOM_GROUPS). Unknown or missing kingdoms go to
    "Unclassified", so the groups always add up to the species total."""

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
        "Fungi": 0,
        "Unclassified": 0,
    }

    for kingdom, count in kingdom_counts:
        group = KINGDOM_GROUPS.get((kingdom or "").strip().lower(), "Unclassified")
        composition[group] += count

    return composition


THREATENED_STATUSES = {"CR", "EN", "VU"}


def _extra_stats(db: Session, species_query, site_id: int | None) -> dict:
    """Rarely-needed counters, only computed when the caller asks for them."""
    association_query = db.query(SiteSpecies)
    validation_query = db.query(SpeciesValidationHistory).filter(
        SpeciesValidationHistory.validated_at >= datetime.now(timezone.utc) - timedelta(days=30)
    )
    if site_id is not None:
        association_query = association_query.filter(SiteSpecies.site_id == site_id)
        validation_query = validation_query.filter(
            SpeciesValidationHistory.species_id.in_(
                db.query(SiteSpecies.species_id).filter(SiteSpecies.site_id == site_id)
            )
        )

    has_iucn = (Species.iucn_status.isnot(None)) & (Species.iucn_status != "")
    complete, missing_taxonomy, missing_conservation = species_query.with_entities(
        func.count(Species.id).filter(_taxonomy_complete_filter() & has_iucn),
        func.count(Species.id).filter(_taxonomy_incomplete_filter()),
        func.count(Species.id).filter(
            _taxonomy_complete_filter() & _conservation_missing_filter()
        ),
    ).one()

    return {
        "total_associations": association_query.count(),
        "completeness_breakdown": {
            "complete": complete,
            "missing_taxonomy": missing_taxonomy,
            "missing_conservation": missing_conservation,
        },
        "validations_last_30_days": validation_query.count(),
    }


def _site_stats(db: Session) -> list[dict]:
    """Per-site counters in ONE grouped query (was 3 count queries per site)."""
    has_iucn = (Species.iucn_status.isnot(None)) & (Species.iucn_status != "")
    rows = (
        db.query(
            Site.id,
            Site.name,
            func.count(Species.id),
            func.count(Species.id).filter(Species.national_status == "Protected"),
            func.count(Species.id).filter(_taxonomy_complete_filter() & has_iucn),
        )
        .outerjoin(SiteSpecies, SiteSpecies.site_id == Site.id)
        .outerjoin(Species, Species.id == SiteSpecies.species_id)
        .group_by(Site.id, Site.name)
        # Richest sites first (the per-site table and the richness chart both use this).
        .order_by(func.count(Species.id).desc(), Site.name.asc())
        .all()
    )
    return [
        {
            "site_id": site_id,
            "site_name": name,
            "species_count": count,
            "protected_count": protected,
            "complete_count": complete,
            "incomplete_count": count - complete,
        }
        for site_id, name, count, protected, complete in rows
    ]


def get_dashboard_stats(
    db: Session, site_id: int | None = None, include_extra: bool = False
) -> dict:
    site = None
    if site_id is not None:
        site = db.query(Site).filter(Site.id == site_id).first()
        if not site:
            raise NotFoundError("Site not found")

    species_query = _species_query_for_scope(db, site_id)

    total_species = species_query.count()
    total_sites = 1 if site is not None else db.query(Site).count()

    # IUCN status. Missing/blank is reported as "NE" (Not Evaluated).
    iucn_breakdown: dict[str, int] = {}
    for status, count in (
        species_query.with_entities(Species.iucn_status, func.count(Species.id))
        .group_by(Species.iucn_status)
        .all()
    ):
        key = (status or "").strip() or "NE"
        iucn_breakdown[key] = iucn_breakdown.get(key, 0) + count

    iucn_threatened_species = sum(
        count for status, count in iucn_breakdown.items() if status in THREATENED_STATUSES
    )

    top_families = [
        {"family": family, "count": count}
        for family, count in (
            species_query.with_entities(Species.family, func.count(Species.id))
            .filter(Species.family.isnot(None), Species.family != "")
            .group_by(Species.family)
            .order_by(func.count(Species.id).desc())
            .limit(10)
            .all()
        )
    ]

    status_breakdown = {
        status or "Unknown": count
        for status, count in species_query.with_entities(
            Species.national_status, func.count(Species.id)
        )
        .group_by(Species.national_status)
        .all()
    }

    site_stats = _site_stats(db) if site is None else []

    # Richness share is relative to the total of species-site associations.
    total_site_species = sum(row["species_count"] for row in site_stats)
    for row in site_stats:
        row["species_share"] = (
            round(row["species_count"] / total_site_species * 100, 1) if total_site_species else 0.0
        )
    species_richness_by_site = [
        {
            "site_name": row["site_name"],
            "species_count": row["species_count"],
            "percentage": round(
                (row["species_count"] / total_site_species) * 100 if total_site_species else 0, 1
            ),
        }
        for row in site_stats
    ]

    result = {
        "total_species": total_species,
        "total_sites": total_sites,
        "iucn_threatened_species": iucn_threatened_species,
        "biodiversity_composition": _biodiversity_composition(species_query),
        "status_breakdown": status_breakdown,
        "iucn_breakdown": iucn_breakdown,
        "species_richness_by_site": species_richness_by_site,
        "site_stats": site_stats,
        "top_families": top_families,
    }

    if include_extra:
        result.update(_extra_stats(db, species_query, site_id))

    if site is not None:
        result["site"] = {"id": site.id, "name": site.name, "code": site.code}

    return result
