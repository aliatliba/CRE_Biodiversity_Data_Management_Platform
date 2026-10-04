from __future__ import annotations

import logging
import os
import resource
import subprocess
import threading
from pathlib import Path
from tempfile import TemporaryDirectory  # noqa: F401  (re-exported for the API)

import pandas as pd
from sqlalchemy.orm import Session

from app.core.graphics_job_store import GraphicsJob
from app.scripts.graphics_registry import GraphicSpec, get_spec  # noqa: F401

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
GRAPHICS_DIR = Path(os.environ.get("GRAPHICS_DIR", str(BASE_DIR / "graphics")))
# Persistent cache shared by all R scripts (e.g. PhyloPic silhouettes)
GRAPHICS_CACHE_DIR = Path(
    os.environ.get("GRAPHICS_CACHE_DIR", str(GRAPHICS_DIR / ".cache"))
)

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

    rows = query.order_by(Species.scientific_name).all()

    unknown = [a for a in spec.required_attrs if not hasattr(Species, a)]
    unknown += [a for a in spec.columns.values() if not hasattr(Species, a)]
    if unknown:
        raise ValueError(
            "Registry error: the Species model has no attribute(s): "
            + ", ".join(sorted(set(unknown)))
        )

    missing = {a: 0 for a in spec.required_attrs}
    records = []
    for species in rows:
        absent = [a for a in spec.required_attrs if not getattr(species, a, None)]
        for a in absent:
            missing[a] += 1
        if absent:
            continue
        records.append(
            {h: getattr(species, attr, None) for h, attr in spec.columns.items()}
        )

    if rows and not records:
        details = ", ".join(f"{a} empty for {n}/{len(rows)}" for a, n in missing.items())
        raise ValueError(
            f"{len(rows)} validated species found, but none has all the "
            f"data this graphic needs ({details})."
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
    GRAPHICS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    command = [
        "Rscript", "--vanilla",
        str(spec.script), str(input_excel), str(output_dir),
    ]

    # Stream R's output line by line into the server logs, so that if the
    # container dies mid-run (e.g. out of memory) the logs still show how
    # far the script got. stderr is merged into stdout to keep the order.
    proc = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env={**os.environ, "GRAPHICS_CACHE_DIR": str(GRAPHICS_CACHE_DIR)},
    )

    timed_out = threading.Event()

    def _kill_on_timeout() -> None:
        timed_out.set()
        proc.kill()

    timer = threading.Timer(spec.timeout, _kill_on_timeout)
    timer.start()

    output_lines: list[str] = []
    try:
        print(f"[R:{spec.key}] started: {' '.join(command)}", flush=True)
        assert proc.stdout is not None
        for line in proc.stdout:
            line = line.rstrip("\n")
            output_lines.append(line)
            print(f"[R:{spec.key}] {line}", flush=True)
        returncode = proc.wait()
    finally:
        timer.cancel()
        if proc.poll() is None:
            proc.kill()

    # Highest memory used so far by any R child process (Linux: KB).
    peak_mb = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss / 1024
    print(
        f"[R:{spec.key}] finished with code {returncode}; "
        f"peak R child memory so far ~{peak_mb:.0f} MB",
        flush=True,
    )

    if timed_out.is_set():
        raise RuntimeError(
            f"The graphic took longer than {spec.timeout} seconds and was stopped."
        )

    if returncode in (-9, 137):
        raise RuntimeError(
            "The R process was killed by the system, most likely because the "
            "server ran out of memory. Try again, or use a larger instance / "
            "a lower GRAPHICS_DPI."
        )

    if returncode != 0:
        tail = "\n".join(output_lines[-60:]).strip()
        raise RuntimeError(
            "R script failed:\n" + tail if tail else "R graphic generation failed."
        )

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