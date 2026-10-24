"""Process-local registry and runner for long-running background jobs.

Bulk imports, batch species lookups and graphics generation can take minutes — far
too long to hold one HTTP request open. The API creates a job, starts the work as a
background asyncio task (``app.core.background.spawn``) and returns the job id
immediately; the client polls the matching ``GET .../{job_id}`` endpoint.

NOTE: the store is an in-memory dict scoped to one process. That is fine for a single
``uvicorn`` worker (see Dockerfile), but with several workers/replicas a job started on
one would be invisible to the others. If that becomes a real deployment target, swap
this for a Redis- or DB-backed store; ``JobStore`` and ``run_job`` are the only places
that would need to change.
"""
from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Generic, TypeVar

import structlog
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import SessionLocal

logger = structlog.get_logger()


@dataclass
class BaseJob:
    id: str
    status: str = "queued"  # queued | running | completed | failed
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None


@dataclass
class Job(BaseJob):
    """Batch species lookup / bulk species import."""

    total: int = 0
    processed: int = 0
    created: int = 0
    linked: int = 0
    skipped: int = 0
    failed: int = 0
    invalid: int = 0
    items: list[Any] = field(default_factory=list)


@dataclass
class GraphicsJob(BaseJob):
    graphic_type: str = ""
    site_id: int | None = None
    site_name: str | None = None
    total_species: int = 0
    processed: int = 0
    files: dict[str, str] = field(default_factory=dict)  # format -> path


J = TypeVar("J", bound=BaseJob)


class JobStore(Generic[J]):
    def __init__(self, job_class: type[J]) -> None:
        self._job_class = job_class
        self._jobs: dict[str, J] = {}

    def purge_expired(self) -> None:
        """Drop finished jobs older than JOB_TTL_SECONDS so the dict cannot grow forever."""
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=get_settings().job_ttl_seconds)
        expired = [
            job_id
            for job_id, job in self._jobs.items()
            if job.finished_at is not None and job.finished_at < cutoff
        ]
        for job_id in expired:
            del self._jobs[job_id]

    def create(self, **fields: Any) -> J:
        self.purge_expired()
        job = self._job_class(id=str(uuid.uuid4()), started_at=datetime.now(timezone.utc), **fields)
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> J | None:
        return self._jobs.get(job_id)


job_store: JobStore[Job] = JobStore(Job)
graphics_job_store: JobStore[GraphicsJob] = JobStore(GraphicsJob)


async def run_job(job: BaseJob, work: Callable[[Session], Awaitable[None]]) -> None:
    """Run ``work(db)`` for ``job``: status transitions, own DB session, error capture.

    The session is opened here and always closed, ``finished_at`` is always set, and an
    exception marks the job ``failed`` (with the message) instead of vanishing inside
    the background task.
    """
    db = SessionLocal()
    try:
        job.status = "running"
        await work(db)
        job.status = "completed"
    except Exception as exc:
        logger.error("job_failed", job_id=job.id, exc_info=exc)
        job.status = "failed"
        job.error = str(exc)
    finally:
        job.finished_at = datetime.now(timezone.utc)
        db.close()
