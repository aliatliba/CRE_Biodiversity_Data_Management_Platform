from dataclasses import asdict
from typing import List

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.background import spawn
from app.core.dependencies import ActiveUser, AdminUser, DBSession
from app.core.job_store import Job, job_store, run_job
from app.core.pagination import Page, PaginationParams, paginate
from app.core.utils import clean_and_dedupe_names
from app.schemas.species import (
    BatchSpeciesLookupItem,
    BatchSpeciesLookupJobResponse,
    BatchSpeciesLookupRequest,
    BulkImportItemResponse,
    BulkImportJobResponse,
    BulkImportRequest,
    SpeciesCreate,
    SpeciesDraft,
    SpeciesListItem,
    SpeciesLookupRequest,
    SpeciesResponse,
    SpeciesUpdate,
    ValidationHistoryResponse,
)
from app.services import site_service, species_service
from app.services.bulk_import_service import ImportSummary, run_bulk_import

router = APIRouter()


@router.get("/check")
def check_species(scientific_name: str, db: DBSession):
    existing = species_service.check_duplicate(db, scientific_name)
    if existing:
        return {"exists": True, "species": existing}
    return {"exists": False}


@router.post("/lookup", response_model=SpeciesDraft)
async def lookup_species(data: SpeciesLookupRequest, db: DBSession):
    return await species_service.lookup_species(db, data.scientific_name)


def _base_job_fields(job: Job) -> dict:
    """Fields shared by the lookup-batch and bulk-import job responses."""
    return {
        "job_id": job.id,
        "status": job.status,
        "total": job.total,
        "processed": job.processed,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "error": job.error,
    }


async def _execute_lookup_batch(job: Job, scientific_names: list[str], site_id: int) -> None:
    # Species finish out of order (bounded concurrency); keep job.items in input order.
    by_index: dict[int, dict] = {}

    async def on_progress(processed: int, total: int, item: dict, index: int) -> None:
        by_index[index] = item
        job.items = [by_index[i] for i in sorted(by_index)]
        job.processed = processed
        job.total = total

    async def work(db: Session) -> None:
        await species_service.lookup_species_batch(
            db=db,
            scientific_names=scientific_names,
            site_id=site_id,
            delay_seconds=1.0,
            on_progress=on_progress,
        )

    await run_job(job, work)


def _lookup_job_to_response(job: Job) -> BatchSpeciesLookupJobResponse:
    return BatchSpeciesLookupJobResponse(
        **_base_job_fields(job),
        items=[BatchSpeciesLookupItem(**item) for item in job.items],
    )


@router.post(
    "/lookup-batch",
    response_model=BatchSpeciesLookupJobResponse,
    status_code=202,
)
async def lookup_species_batch(
    data: BatchSpeciesLookupRequest,
    db: DBSession,
    user: ActiveUser,
):
    """
    Start a review-only batch lookup.

    The lookup runs in the background so the request returns immediately.
    The frontend can poll /lookup-batch/{job_id} for real-time progress.
    """

    names = clean_and_dedupe_names(data.scientific_names)

    if not names:
        raise HTTPException(
            status_code=400,
            detail="At least one scientific name is required.",
        )

    site_service.get_site(db, data.site_id)

    job = job_store.create()
    job.total = len(names)

    spawn(_execute_lookup_batch(job, names, data.site_id))

    return _lookup_job_to_response(job)


@router.get(
    "/lookup-batch/{job_id}",
    response_model=BatchSpeciesLookupJobResponse,
)
def get_lookup_batch_status(
    job_id: str,
    user: ActiveUser,
):
    job = job_store.get(job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Lookup job not found",
        )

    return _lookup_job_to_response(job)


def _job_to_response(job: Job) -> BulkImportJobResponse:
    return BulkImportJobResponse(
        **_base_job_fields(job),
        created=job.created,
        linked=job.linked,
        skipped=job.skipped,
        failed=job.failed,
        invalid=job.invalid,
        items=[BulkImportItemResponse(**item) for item in job.items],
    )


async def _execute_bulk_import(job: Job, data: BulkImportRequest, user_id: int) -> None:
    async def on_progress(summary: ImportSummary) -> None:
        job.processed = len(summary.items)
        job.created = summary.created
        job.linked = summary.linked
        job.skipped = summary.skipped
        job.failed = summary.failed
        job.invalid = summary.invalid
        job.items = [asdict(item) for item in summary.items]

    async def work(db: Session) -> None:
        await run_bulk_import(
            db=db,
            names=data.scientific_names,
            site_id=data.site_id,
            user_id=user_id,
            delay_seconds=data.delay_seconds,
            dry_run=data.dry_run,
            on_progress=on_progress,
        )

    await run_job(job, work)


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

    spawn(_execute_bulk_import(job, data, user.id))

    return _job_to_response(job)


@router.get("/bulk-import/{job_id}", response_model=BulkImportJobResponse)
def get_bulk_import_status(job_id: str, user: AdminUser):
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found")
    return _job_to_response(job)


@router.get("", response_model=Page[SpeciesListItem])
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
    iucn_status: str | None = Query(
        None,
        description=(
            "One or more IUCN statuses. Accepts a single value (e.g. 'CR') "
            "or a comma-separated list (e.g. 'CR,EN,VU'), matched as an OR."
        ),
    ),
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
        iucn_status=iucn_status,
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
