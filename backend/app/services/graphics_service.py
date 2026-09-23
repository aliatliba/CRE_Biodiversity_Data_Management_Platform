from __future__ import annotations

import os
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

import pandas as pd
from sqlalchemy.orm import Session

from app.core.graphics_job_store import GraphicsJob


BASE_DIR = Path(__file__).resolve().parents[1]
R_SCRIPT = BASE_DIR / "scripts" / "dendrogramme_taxonomique.R"

GRAPHICS_DIR = Path(
    os.environ.get(
        "GRAPHICS_DIR",
        str(BASE_DIR / "graphics"),
    )
)


def _safe_filename(value: str) -> str:
    value = value.strip()

    cleaned = "".join(
        character if character.isalnum() or character in ("-", "_")
        else "_"
        for character in value
    )

    return cleaned.strip("_") or "site"


def build_site_excel(
    db: Session,
    site_id: int,
    output_path: Path,
) -> tuple[str, int]:
    """
    Build the Excel input expected by the R dendrogram script.

    Only validated species associated with the selected site are included.
    """

    from app.models.site import Site
    from app.models.site_species import SiteSpecies
    from app.models.species import Species

    site = (
        db.query(Site)
        .filter(Site.id == site_id)
        .first()
    )

    if site is None:
        raise ValueError("Research site not found.")

    rows = (
        db.query(Species)
        .join(
            SiteSpecies,
            SiteSpecies.species_id == Species.id,
        )
        .filter(
            SiteSpecies.site_id == site_id,
            Species.status == "validated",
        )
        .order_by(Species.scientific_name)
        .all()
    )

    records = []

    for species in rows:
        records.append(
            {
                "Kingdom": species.kingdom,
                "Class": species.class_name,
                "Order": species.order_name,
                "Family": species.family,
                "Genus": species.genus,
                "Scientific name": species.scientific_name,
            }
        )

    dataframe = pd.DataFrame(
        records,
        columns=[
            "Kingdom",
            "Class",
            "Order",
            "Family",
            "Genus",
            "Scientific name",
        ],
    )

    dataframe.to_excel(
        output_path,
        index=False,
        sheet_name="Species",
    )

    return site.name, len(records)


def run_r_dendrogram(
    input_excel: Path,
    output_dir: Path,
) -> tuple[Path, Path, Path]:
    """
    Execute the R dendrogram script and preserve the complete
    R diagnostic output when generation fails.
    """

    if not R_SCRIPT.exists():
        raise RuntimeError(
            f"R script not found: {R_SCRIPT}"
        )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    command = [
        "Rscript",
        "--vanilla",
        str(R_SCRIPT),
        str(input_excel),
        str(output_dir),
    ]

    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=900,
        check=False,
    )

    # Always print the R output to the API/container logs.
    print("\n========== R DENDROGRAM ==========")
    print("COMMAND:")
    print(" ".join(command))

    print("\n--- STDOUT ---")
    print(completed.stdout or "(empty)")

    print("\n--- STDERR ---")
    print(completed.stderr or "(empty)")

    print("\n--- RETURN CODE ---")
    print(completed.returncode)

    print("==================================\n")

    if completed.returncode != 0:

        stdout = completed.stdout.strip()
        stderr = completed.stderr.strip()

        diagnostic_parts = []

        if stdout:
            diagnostic_parts.append(
                "R STDOUT:\n" + stdout
            )

        if stderr:
            diagnostic_parts.append(
                "R STDERR:\n" + stderr
            )

        diagnostic = "\n\n".join(
            diagnostic_parts
        )

        raise RuntimeError(
            diagnostic
            or "R dendrogram generation failed."
        )

    png_file = (
        output_dir /
        "dendrogramme_circulaire.png"
    )

    tiff_file = (
        output_dir /
        "dendrogramme_circulaire.tiff"
    )

    pdf_file = (
        output_dir /
        "dendrogramme_circulaire.pdf"
    )

    missing = [
        str(path)
        for path in (
            png_file,
            tiff_file,
            pdf_file,
        )
        if not path.exists()
    ]

    if missing:
        raise RuntimeError(
            "R completed but did not produce all expected files: "
            + ", ".join(missing)
        )

    return (
        png_file,
        tiff_file,
        pdf_file,
    )

def graphics_job_response(job: GraphicsJob) -> dict:
    return {
        "job_id": job.id,
        "status": job.status,
        "site_id": job.site_id,
        "site_name": job.site_name,
        "total_species": job.total_species,
        "processed": job.processed,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "error": job.error,
        "png_available": bool(job.png_file),
        "tiff_available": bool(job.tiff_file),
        "pdf_available": bool(job.pdf_file),
    }