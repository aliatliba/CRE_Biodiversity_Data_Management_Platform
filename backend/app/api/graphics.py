from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.db import SessionLocal
from app.core.dependencies import ActiveUser
from app.core.graphics_job_store import graphics_job_store
from app.schemas.graphics import (
    GraphicsGenerateRequest,
    GraphicsJobResponse,
    GraphicTypeResponse,
)
from app.scripts.graphics_registry import GRAPHIC_SPECS, GraphicSpec, get_spec
from app.services import graphics_service

router = APIRouter()

# R is memory hungry: limit how many scripts run at the same time.
_r_slots = asyncio.Semaphore(2)


async def _execute_graphics_job(job_id: str, site_id: int, spec: GraphicSpec) -> None:
    job = graphics_job_store.get(job_id)
    if job is None:
        return

    db = SessionLocal()
    try:
        async with _r_slots:
            job.status = "running"
            with graphics_service.TemporaryDirectory(prefix=f"graphics_{job_id}_") as tmp:
                input_excel = Path(tmp) / "input.xlsx"

                site_name, total = await asyncio.to_thread(
                    graphics_service.build_site_excel, db, site_id, spec, input_excel
                )
                job.site_name = site_name
                job.total_species = total

                if total == 0:
                    raise ValueError(
                        f"This research site has no validated species "
                        f"records usable for “{spec.label}”."
                    )

                output_dir = (
                    graphics_service.GRAPHICS_DIR
                    / f"{job_id}_{graphics_service._safe_filename(site_name)}"
                )
                files = await asyncio.to_thread(
                    graphics_service.run_r_script, spec, input_excel, output_dir
                )

            job.files = {fmt: str(path) for fmt, path in files.items()}
            job.processed = total
            job.status = "completed"
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
    finally:
        job.finished_at = datetime.now(timezone.utc)
        db.close()


@router.get("/types", response_model=list[GraphicTypeResponse])
def list_graphic_types(user: ActiveUser):
    return [
        GraphicTypeResponse(
            key=s.key, label=s.label, description=s.description, formats=list(s.formats)
        )
        for s in GRAPHIC_SPECS.values()
    ]


@router.post("/jobs", response_model=GraphicsJobResponse, status_code=202)
async def generate_graphics(data: GraphicsGenerateRequest, user: ActiveUser):
    try:
        spec = get_spec(data.graphic_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    job = graphics_job_store.create(spec.key)
    job.site_id = data.site_id
    asyncio.create_task(_execute_graphics_job(job.id, data.site_id, spec))
    return graphics_service.graphics_job_response(job)


@router.get("/jobs/{job_id}", response_model=GraphicsJobResponse)
def get_graphics_job(job_id: str, user: ActiveUser):
    job = graphics_job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Graphics job not found.")
    return graphics_service.graphics_job_response(job)


def _get_file(job_id: str, file_type: str) -> tuple[Path, str]:
    job = graphics_job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Graphics job not found.")
    if job.status != "completed":
        raise HTTPException(status_code=404, detail="Graphics are not ready yet.")

    file_path = job.files.get(file_type)
    if not file_path or not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="Requested graphics file was not found.")

    site = graphics_service._safe_filename(job.site_name or "site")
    return Path(file_path), f"{job.graphic_type}_{site}.{file_type}"


@router.get("/jobs/{job_id}/preview")
def preview_graphics(job_id: str, user: ActiveUser):
    path, _ = _get_file(job_id, "png")
    return FileResponse(path=path, media_type="image/png")


@router.get("/jobs/{job_id}/download/{file_type}")
def download_graphics(job_id: str, file_type: str, user: ActiveUser):
    if file_type not in graphics_service.MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported graphics format.")
    path, filename = _get_file(job_id, file_type)
    return FileResponse(
        path=path,
        filename=filename,
        media_type=graphics_service.MEDIA_TYPES[file_type],
    )