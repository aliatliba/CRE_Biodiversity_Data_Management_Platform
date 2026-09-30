from __future__ import annotations

import logging
import os
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory  # noqa: F401  (re-exported for the API)

import pandas as pd
from sqlalchemy.orm import Session

from app.core.graphics_job_store import GraphicsJob
from app.scripts.graphics_registry import GraphicSpec, get_spec  # noqa: F401

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
GRAPHICS_DIR = Path(os.environ.get("GRAPHICS_DIR", str(BASE_DIR / "graphics")))

MEDIA_TYPES = {
    "png": "image/png",
    "tiff": "image/tiff",
    "pdf": "application/pdf",
}


def _safe_filename(value: str) -> str:
    cleaned = "".join(
        c if c.isalnum() or c in ("-", "_") else "_" for c in value.strip()
    )
    return cleaned.strip("_") or "site"


def build_site_excel(
    db: Session,
    site_id: int,
    spec: GraphicSpec,
    output_path: Path,
) -> tuple[str, int]:
    """Export the site's species to the Excel layout the R script expects."""
    from app.models.site import Site
    from app.models.site_species import SiteSpecies
    from app.models.species import Species

    site = db.query(Site).filter(Site.id == site_id).first()
    if site is None:
        raise ValueError("Research site not found.")

    query = (
        db.query(Species)
        .join(SiteSpecies, SiteSpecies.species_id == Species.id)
        .filter(SiteSpecies.site_id == site_id)
    )
    if spec.only_validated:
        query = query.filter(Species.status == "validated")

    records = []
    for species in query.order_by(Species.scientific_name).all():
        if spec.required_attr and not getattr(species, spec.required_attr, None):
            continue
        records.append(
            {
                header: getattr(species, attr, None)
                for header, attr in spec.columns.items()
            }
        )

    pd.DataFrame(records, columns=list(spec.columns)).to_excel(
        output_path, index=False, sheet_name="Species"
    )
    return site.name, len(records)


def run_r_script(
    spec: GraphicSpec,
    input_excel: Path,
    output_dir: Path,
) -> dict[str, Path]:
    """Run the spec's R script and return {format: file_path}."""
    if not spec.script.exists():
        raise RuntimeError(f"R script not found: {spec.script}")

    output_dir.mkdir(parents=True, exist_ok=True)

    command = [
        "Rscript", "--vanilla",
        str(spec.script), str(input_excel), str(output_dir),
    ]
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=spec.timeout,
        check=False,
    )

    logger.info(
        "R script %s finished (code %s)\n--- STDOUT ---\n%s\n--- STDERR ---\n%s",
        spec.script.name,
        completed.returncode,
        completed.stdout or "(empty)",
        completed.stderr or "(empty)",
    )

    if completed.returncode != 0:
        parts = []
        if completed.stdout.strip():
            parts.append("R STDOUT:\n" + completed.stdout.strip())
        if completed.stderr.strip():
            parts.append("R STDERR:\n" + completed.stderr.strip())
        raise RuntimeError("\n\n".join(parts) or "R graphic generation failed.")

    files = {fmt: output_dir / f"{spec.output_basename}.{fmt}" for fmt in spec.formats}
    missing = [str(p) for p in files.values() if not p.exists()]
    if missing:
        raise RuntimeError(
            "R completed but did not produce all expected files: " + ", ".join(missing)
        )
    return files


def graphics_job_response(job: GraphicsJob) -> dict:
    return {
        "job_id": job.id,
        "status": job.status,
        "graphic_type": job.graphic_type,
        "site_id": job.site_id,
        "site_name": job.site_name,
        "total_species": job.total_species,
        "processed": job.processed,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "error": job.error,
        "available_formats": list(job.files),
    }