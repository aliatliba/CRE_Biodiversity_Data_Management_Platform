import csv
import io
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.export import Export
from app.models.species import Species
from app.models.site_species import SiteSpecies
from app.models.site import Site


EXPORTS_DIR = os.environ.get("EXPORTS_DIR", "./exports")


def _ensure_exports_dir() -> None:
    os.makedirs(EXPORTS_DIR, exist_ok=True)


def _build_export_query(db: Session, filters: dict[str, Any] | None):
    query = (
        db.query(Species, Site.name.label("site_name"))
        .join(SiteSpecies, SiteSpecies.species_id == Species.id)
        .join(Site, Site.id == SiteSpecies.site_id)
        .filter(Species.status == "validated")
    )
    if not filters:
        return query
    if "site_id" in filters:
        query = query.filter(SiteSpecies.site_id == filters["site_id"])
    if "national_status" in filters:
        query = query.filter(Species.national_status == filters["national_status"])
    if "family" in filters:
        query = query.filter(Species.family.ilike(f"%{filters['family']}%"))
    if "date_from" in filters:
        query = query.filter(Species.validated_at >= filters["date_from"])
    if "date_to" in filters:
        query = query.filter(Species.validated_at <= filters["date_to"])
    return query


def generate_csv(db: Session, filters: dict[str, Any] | None) -> str:
    _ensure_exports_dir()
    query = _build_export_query(db, filters)
    rows = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "scientific_name", "kingdom", "class_name", "order_name", "family",
        "genus", "species_epithet", "common_name", "iucn_status", "iucn_trend",
        "national_status", "guild", "ecosystem_service", "habitat", "typology",
        "endemism", "potential_threats", "reference", "site_name",
        "validated_by", "validated_at",
    ])
    for species, site_name in rows:
        writer.writerow([
            species.id, species.scientific_name, species.kingdom, species.class_name,
            species.order_name, species.family, species.genus, species.species_epithet,
            species.common_name, species.iucn_status, species.iucn_trend,
            species.national_status, species.guild, species.ecosystem_service,
            species.habitat, species.typology, species.endemism,
            species.potential_threats, species.reference, site_name,
            species.validator.full_name if species.validator else "", species.validated_at.isoformat() if species.validated_at else "",
        ])
    return output.getvalue()


def generate_xlsx(db: Session, filters: dict[str, Any] | None) -> bytes:
    _ensure_exports_dir()
    try:
        import openpyxl
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="XLSX generation requires openpyxl",
        )

    query = _build_export_query(db, filters)
    rows = query.all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Species"
    headers = [
        "id", "scientific_name", "kingdom", "class_name", "order_name", "family",
        "genus", "species_epithet", "common_name", "iucn_status", "iucn_trend",
        "national_status", "guild", "ecosystem_service", "habitat", "typology",
        "endemism", "potential_threats", "reference", "site_name",
        "validated_by", "validated_at",
    ]
    ws.append(headers)
    for species, site_name in rows:
        ws.append([
            species.id, species.scientific_name, species.kingdom, species.class_name,
            species.order_name, species.family, species.genus, species.species_epithet,
            species.common_name, species.iucn_status, species.iucn_trend,
            species.national_status, species.guild, species.ecosystem_service,
            species.habitat, species.typology, species.endemism,
            species.potential_threats, species.reference, site_name,
            species.validator.full_name if species.validator else "", species.validated_at.isoformat() if species.validated_at else "",
        ])
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported export format",
        )

    export.status = "done"
    export.file_path = filepath
    export.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(export)
    return export


def get_export(db: Session, export_id: int) -> Export:
    export = db.query(Export).filter(Export.id == export_id).first()
    if not export:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export not found",
        )
    return export


def list_exports(db: Session, user_id: int) -> list[Export]:
    return db.query(Export).filter(Export.requested_by == user_id).order_by(Export.created_at.desc()).all()
