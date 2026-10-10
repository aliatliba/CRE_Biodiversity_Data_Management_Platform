import csv
import io
import os
from datetime import datetime, timezone
from typing import Any

import openpyxl
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func

from app.core.exceptions import BadRequestError, NotFoundError
from app.core.config import get_settings
from app.core.utils import purge_old_entries
from app.models.export import Export
from app.models.species import Species, name_search_filter
from app.models.site_species import SiteSpecies
from app.models.site import Site


EXPORTS_DIR = get_settings().exports_dir


def _parse_dt(value: Any) -> datetime | None:
    """Filters are stored as JSON, so datetimes come back as ISO strings."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _ensure_exports_dir() -> None:
    os.makedirs(EXPORTS_DIR, exist_ok=True)
    purge_old_entries(EXPORTS_DIR, get_settings().exports_retention_hours)


def _build_export_query(db: Session, filters: dict[str, Any] | None):
    filters = filters or {}
    date_from = _parse_dt(filters.get("date_from"))
    date_to = _parse_dt(filters.get("date_to"))

    site_ids = filters.get("site_ids")

    # Main query:
    # One row per species, with all matching site names aggregated.
    query = (
        db.query(
            Species,
            func.string_agg(
                func.distinct(Site.name),
                ", "
            ).label("site_names"),
        )
        .options(selectinload(Species.validator))
        .join(SiteSpecies, SiteSpecies.species_id == Species.id)
        .join(Site, Site.id == SiteSpecies.site_id)
        .filter(Species.status == "validated")
    )

    # Site filter
    if site_ids:
        query = query.filter(SiteSpecies.site_id.in_(site_ids))

    # Taxonomy filters
    if filters.get("kingdom"):
        query = query.filter(
            Species.kingdom.ilike(f"%{filters['kingdom']}%")
        )

    if filters.get("class_name"):
        query = query.filter(
            Species.class_name.ilike(f"%{filters['class_name']}%")
        )

    if filters.get("order_name"):
        query = query.filter(
            Species.order_name.ilike(f"%{filters['order_name']}%")
        )

    if filters.get("family"):
        query = query.filter(
            Species.family.ilike(f"%{filters['family']}%")
        )

    if filters.get("genus"):
        query = query.filter(
            Species.genus.ilike(f"%{filters['genus']}%")
        )

    # Search
    if filters.get("search"):
        query = query.filter(name_search_filter(filters["search"]))

    # Conservation filters
    if filters.get("iucn_status"):
        query = query.filter(
            Species.iucn_status == filters["iucn_status"]
        )

    if filters.get("iucn_trend"):
        query = query.filter(
            Species.iucn_trend == filters["iucn_trend"]
        )

    if filters.get("national_status"):
        query = query.filter(
            Species.national_status == filters["national_status"]
        )

    # Validation date filters
    if date_from:
        query = query.filter(Species.validated_at >= date_from)

    if date_to:
        query = query.filter(Species.validated_at <= date_to)

    # Critical part:
    # group everything by species so each species appears exactly once.
    query = query.group_by(Species.id)

    query = query.order_by(Species.scientific_name.asc())

    return query

def get_export_options(db: Session) -> dict[str, list]:
    """Return distinct values available for export filters."""

    def distinct_values(column):
        rows = (
            db.query(column)
            .filter(column.isnot(None))
            .filter(column != "")
            .distinct()
            .order_by(column.asc())
            .all()
        )
        return [row[0] for row in rows]

    sites = (
        db.query(Site.id, Site.name)
        .join(SiteSpecies, SiteSpecies.site_id == Site.id)
        .join(Species, Species.id == SiteSpecies.species_id)
        .filter(Species.status == "validated")
        .distinct()
        .order_by(Site.name.asc())
        .all()
    )

    return {
        "sites": [
            {
                "id": site_id,
                "name": site_name,
            }
            for site_id, site_name in sites
        ],
        "kingdoms": distinct_values(Species.kingdom),
        "classes": distinct_values(Species.class_name),
        "orders": distinct_values(Species.order_name),
        "families": distinct_values(Species.family),
        "genera": distinct_values(Species.genus),
        "iucn_statuses": distinct_values(Species.iucn_status),
        "iucn_trends": distinct_values(Species.iucn_trend),
        "national_statuses": distinct_values(Species.national_status),
    }


EXPORT_COLUMNS = [
    "id", "scientific_name", "kingdom", "class_name", "order_name", "family",
    "genus", "species_epithet", "common_name", "iucn_status", "iucn_trend",
    "national_status", "guild", "ecosystem_service", "habitat", "typology",
    "endemism", "potential_threats", "reference", "site_name",
    "validated_by", "validated_at",
]  # fmt: skip

# Plain species attributes exported as-is, in column order.
_SPECIES_ATTRS = EXPORT_COLUMNS[:19]


def _row(species: Species, site_names: str | None) -> list[Any]:
    """One export row (shared by CSV and XLSX); order follows EXPORT_COLUMNS."""
    return [
        *(getattr(species, attr) for attr in _SPECIES_ATTRS),
        site_names or "",
        species.validator.full_name if species.validator else "",
        species.validated_at.isoformat() if species.validated_at else "",
    ]


def generate_csv(db: Session, filters: dict[str, Any] | None) -> str:
    _ensure_exports_dir()
    rows = _build_export_query(db, filters).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(EXPORT_COLUMNS)
    for species, site_names in rows:
        writer.writerow(_row(species, site_names))

    # BOM so Excel opens the UTF-8 file with French accents intact.
    return "\ufeff" + output.getvalue()


def generate_xlsx(db: Session, filters: dict[str, Any] | None) -> bytes:
    _ensure_exports_dir()
    rows = _build_export_query(db, filters).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Species"
    ws.append(EXPORT_COLUMNS)
    for species, site_names in rows:
        ws.append(_row(species, site_names))
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def create_export(db: Session, format: str, filters: dict[str, Any] | None, user_id: int) -> Export:
    export = Export(
        requested_by=user_id,
        format=format,
        filters=filters,
        status="processing",
    )
    db.add(export)
    db.commit()
    db.refresh(export)

    filename = f"export_{export.id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    if format == "csv":
        content = generate_csv(db, filters)
        filepath = os.path.join(EXPORTS_DIR, f"{filename}.csv")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
    elif format == "xlsx":
        content = generate_xlsx(db, filters)
        filepath = os.path.join(EXPORTS_DIR, f"{filename}.xlsx")
        with open(filepath, "wb") as f:
            f.write(content)
    else:
        export.status = "failed"
        db.commit()
        raise BadRequestError("Unsupported export format")

    export.status = "done"
    export.file_path = filepath
    export.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(export)
    return export


def get_export(db: Session, export_id: int) -> Export:
    export = db.query(Export).filter(Export.id == export_id).first()
    if not export:
        raise NotFoundError("Export not found")
    return export


def list_exports(db: Session, user_id: int) -> list[Export]:
    return db.query(Export).filter(Export.requested_by == user_id).order_by(Export.created_at.desc()).all()


