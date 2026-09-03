import asyncio
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import DBSession, ActiveUser, AdminUser
from app.core.db import SessionLocal
from app.core.job_store import Job, job_store
from app.schemas.species import (
    SpeciesCreate,
    SpeciesUpdate,
    SpeciesResponse,
    SpeciesLookupRequest,
    SiteSpeciesCreate,
    SiteSpeciesResponse,
    ValidationHistoryResponse,
    BulkImportRequest,
    BulkImportJobResponse,
    BulkImportItemResponse,
)
from app.services import species_service, site_service
from app.services.bulk_import_service import ImportSummary, run_bulk_import
from app.core.pagination import PaginationParams, paginate,Page

router = APIRouter()


@router.get("/check")
def check_species(scientific_name: str, db: DBSession):
    existing = species_service.check_duplicate(db, scientific_name)
    if existing:
        return {"exists": True, "species": existing}
    return {"exists": False}


@router.post("/lookup")
async def lookup_species(data: SpeciesLookupRequest):
    draft = await species_service.lookup_species(data.scientific_name)
    return draft


def _job_to_response(job: Job) -> BulkImportJobResponse:
    return BulkImportJobResponse(
        job_id=job.id,
        status=job.status,
        total=job.total,
        processed=job.processed,
        created=job.created,
        skipped=job.skipped,
        failed=job.failed,
        invalid=job.invalid,
        items=[BulkImportItemResponse(**item) for item in job.items],
        started_at=job.started_at,
        finished_at=job.finished_at,
        error=job.error,
    )


async def _execute_bulk_import(job_id: str, data: BulkImportRequest, user_id: int) -> None:
    job = job_store.get(job_id)
    if job is None:
        return

    async def on_progress(summary: ImportSummary) -> None:
        job.processed = len(summary.items)
        job.created = summary.created
        job.skipped = summary.skipped
        job.failed = summary.failed
        job.invalid = summary.invalid
        job.items = [asdict(item) for item in summary.items]

    db: Session = SessionLocal()
    try:
        job.status = "running"
        await run_bulk_import(
            db=db,
            names=data.scientific_names,
            site_id=data.site_id,
            user_id=user_id,
            delay_seconds=data.delay_seconds,
            dry_run=data.dry_run,
            on_progress=on_progress,
        )
        job.status = "completed"
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
    finally:
        from datetime import datetime, timezone

        job.finished_at = datetime.now(timezone.utc)
        db.close()


@router.post("/bulk-import", response_model=BulkImportJobResponse, status_code=202)
async def bulk_import_species(
    data: BulkImportRequest,
    db: DBSession,
    user: AdminUser,
):
    """Kick off an async bulk import of up to 300 species by scientific name.

    Each name is looked up against GBIF/IUCN/POWO/Wikidata/iNaturalist and,
    if not already in the DB, inserted and associated with `site_id`. A
    delay (`delay_seconds`, default 1.5s) is inserted between species to
    stay under the external providers' rate limits, so this runs in the
    background rather than blocking the request — poll
    `GET /species/bulk-import/{job_id}` for progress and results.
    """
    # Validate the site up front with the request-scoped session so a typo
    # fails immediately with a 404 instead of after the job has started.
    site_service.get_site(db, data.site_id)

    job = job_store.create()
    job.total = len(data.scientific_names)

    asyncio.create_task(_execute_bulk_import(job.id, data, user.id))

    return _job_to_response(job)


@router.get("/bulk-import/{job_id}", response_model=BulkImportJobResponse)
def get_bulk_import_status(job_id: str, user: AdminUser):
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found")
    return _job_to_response(job)


@router.get("", response_model=Page[SpeciesResponse])
def list_species(
    db: DBSession,
    user: ActiveUser,
    status: str | None = Query(None),
    search: str | None = Query(None),
    kingdom: str | None = Query(None),
    class_name: str | None = Query(None),
    order_name: str | None = Query(None),
    family: str | None = Query(None),
    genus: str | None = Query(None),
    national_status: str | None = Query(None),
    site_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    params = PaginationParams(page=page, page_size=page_size)
    items, total = species_service.list_species(
        db,
        status=status,
        search=search,
        kingdom=kingdom,
        class_name=class_name,
        order_name=order_name,
        family=family,
        genus=genus,
        national_status=national_status,
        site_id=site_id,
        page=page,
        page_size=page_size,
    )
    return paginate(items, total, params)


@router.get("/{species_id}", response_model=SpeciesResponse)
def get_species(species_id: int, db: DBSession, user: ActiveUser):
    return species_service.get_species(db, species_id)


@router.get("/{species_id}/history", response_model=List[ValidationHistoryResponse])
def get_species_history(species_id: int, db: DBSession, user: ActiveUser):
    return species_service.get_species_history(db, species_id)


@router.post("", response_model=SpeciesResponse, status_code=201)
def create_species(
    data: SpeciesCreate, db: DBSession, user: ActiveUser
):
    return species_service.create_species(db, data, user.id)


@router.patch("/{species_id}", response_model=SpeciesResponse)
def update_species(
    species_id: int,
    data: SpeciesUpdate,
    db: DBSession,
    user: ActiveUser,
):
    return species_service.update_species(db, species_id, data, user.id)


@router.delete("/{species_id}")
def delete_species(species_id: int, db: DBSession, user: AdminUser):
    species_service.delete_species(db, species_id)
    return {"detail": "Species deleted"}


@router.post("/{site_id}/species", response_model=SiteSpeciesResponse, status_code=201)
def associate_species(
    site_id: int,
    data: SiteSpeciesCreate,
    db: DBSession,
    user: ActiveUser,
):
    return species_service.associate_species_with_site(db, site_id, data, user.id)


@router.get("/{site_id}/species", response_model=List[SiteSpeciesResponse])
def list_site_species(site_id: int, db: DBSession, user: ActiveUser):
    return species_service.list_species_for_site(db, site_id)


@router.delete("/{site_id}/species/{species_id}")
def remove_site_species(
    site_id: int, species_id: int, db: DBSession, user: ActiveUser
):
    species_service.remove_site_species(db, site_id, species_id)
    return {"detail": "Association removed"}