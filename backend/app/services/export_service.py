import csv
import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.export import Export
from app.models.species import Species
from app.repositories.export_repository import ExportRepository

EXPORT_STORAGE_DIR = Path("/data/exports")
EXPORT_COLUMNS = [
    "scientific_name",
    "kingdom",
    "class_name",
    "order_name",
    "family",
    "genus",
    "species_epithet",
    "common_name",
    "iucn_status",
    "iucn_trend",
    "national_status",
    "guild",
    "ecosystem_service",
    "habitat",
    "typology",
    "endemism",
    "potential_threats",
    "reference",
]


class ExportService:
    """V1 runs export generation inline (or via FastAPI BackgroundTasks at the
    API layer) — no dedicated task queue. See README Section 15.
    """

    def __init__(self, db: Session):
        self.db = db
        self.exports = ExportRepository(db)

    def _query_validated_species(self, filters: dict[str, Any] | None) -> list[Species]:
        stmt = select(Species).where(Species.status == "validated").order_by(Species.scientific_name)
        if filters:
            if filters.get("family"):
                stmt = stmt.where(Species.family == filters["family"])
            if filters.get("national_status"):
                stmt = stmt.where(Species.national_status == filters["national_status"])
        return list(self.db.execute(stmt).scalars().all())

    def create_and_run(self, requested_by: int, fmt: str, filters: dict[str, Any] | None) -> Export:
        export = self.exports.create(
            Export(requested_by=requested_by, format=fmt, filters=filters, status="processing")
        )

        species_list = self._query_validated_species(filters)
        EXPORT_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        file_path = EXPORT_STORAGE_DIR / f"export_{export.id}.{fmt}"

        if fmt == "csv":
            self._write_csv(species_list, file_path)
        else:
            self._write_xlsx(species_list, file_path)

        export.status = "done"
        export.file_path = str(file_path)
        export.completed_at = datetime.now(timezone.utc)
        return self.exports.update(export)

    def _write_csv(self, species_list: list[Species], file_path: Path) -> None:
        with io.open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=EXPORT_COLUMNS)
            writer.writeheader()
            for sp in species_list:
                writer.writerow({col: getattr(sp, col) for col in EXPORT_COLUMNS})

    def _write_xlsx(self, species_list: list[Species], file_path: Path) -> None:
        wb = Workbook()
        ws = wb.active
        ws.append(EXPORT_COLUMNS)
        for sp in species_list:
            ws.append([getattr(sp, col) for col in EXPORT_COLUMNS])
        wb.save(file_path)
