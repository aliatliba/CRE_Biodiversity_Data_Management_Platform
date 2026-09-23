from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.db import SessionLocal
from app.core.dependencies import ActiveUser, DBSession
from app.core.graphics_job_store import graphics_job_store
from app.schemas.graphics import (
    GraphicsGenerateRequest,
    GraphicsJobResponse,
)
from app.services import graphics_service


router = APIRouter()


async def _execute_graphics_job(
    job_id: str,
    site_id: int,
) -> None:
    job = graphics_job_store.get(job_id)

    if job is None:
        return

    db = SessionLocal()

    try:
        job.status = "running"

        with graphics_service.TemporaryDirectory(
            prefix=f"graphics_{job_id}_"
        ) as temp_dir:

            temp_path = Path(temp_dir)

            input_excel = temp_path / "species_taxonomy.xlsx"

            site_name, total_species = (
                graphics_service.build_site_excel(
                    db,
                    site_id,
                    input_excel,
                )
            )

            job.site_id = site_id
            job.site_name = site_name
            job.total_species = total_species

            if total_species == 0:
                raise ValueError(
                    "This research site has no validated species "
                    "records to visualize."
                )

            job.processed = 0

            safe_site_name = graphics_service._safe_filename(
                site_name
            )

            output_dir = (
                graphics_service.GRAPHICS_DIR
                / f"{job_id}_{safe_site_name}"
            )

            (
                png_file,
                tiff_file,
                pdf_file,
            ) = await asyncio.to_thread(
                graphics_service.run_r_dendrogram,
                input_excel,
                output_dir,
            )

            job.png_file = str(png_file)
            job.tiff_file = str(tiff_file)
            job.pdf_file = str(pdf_file)

            job.processed = total_species
            job.status = "completed"

    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)

    finally:
        from datetime import datetime, timezone

        job.finished_at = datetime.now(timezone.utc)
        db.close()


@router.post(
    "/jobs",
    response_model=GraphicsJobResponse,
    status_code=202,
)
async def generate_graphics(
    data: GraphicsGenerateRequest,
    user: ActiveUser,
):
    job = graphics_job_store.create()

    job.site_id = data.site_id

    asyncio.create_task(
        _execute_graphics_job(
            job.id,
            data.site_id,
        )
    )

    return graphics_service.graphics_job_response(job)


@router.get(
    "/jobs/{job_id}",
    response_model=GraphicsJobResponse,
)
def get_graphics_job(
    job_id: str,
    user: ActiveUser,
):
    job = graphics_job_store.get(job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Graphics job not found.",
        )

    return graphics_service.graphics_job_response(job)


def _get_file(
    job_id: str,
    file_type: str,
):
    job = graphics_job_store.get(job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Graphics job not found.",
        )

    if job.status != "completed":
        raise HTTPException(
            status_code=404,
            detail="Graphics are not ready yet.",
        )

    path_map = {
        "png": job.png_file,
        "tiff": job.tiff_file,
        "pdf": job.pdf_file,
    }

    file_path = path_map[file_type]

    if not file_path or not Path(file_path).exists():
        raise HTTPException(
            status_code=404,
            detail="Requested graphics file was not found.",
        )

    return Path(file_path)


@router.get("/jobs/{job_id}/preview")
def preview_graphics(
    job_id: str,
    user: ActiveUser,
):
    path = _get_file(job_id, "png")

    return FileResponse(
        path=path,
        media_type="image/png",
    )


@router.get("/jobs/{job_id}/download/{file_type}")
def download_graphics(
    job_id: str,
    file_type: str,
    user: ActiveUser,
):
    if file_type not in {"png", "tiff", "pdf"}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported graphics format.",
        )

    path = _get_file(job_id, file_type)

    media_types = {
        "png": "image/png",
        "tiff": "image/tiff",
        "pdf": "application/pdf",
    }

    return FileResponse(
        path=path,
        filename=f"dendrogramme_circulaire.{file_type}",
        media_type=media_types[file_type],
    )