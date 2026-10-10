"""Process-local registry for tracking long-running bulk-import jobs.

A bulk import of ~300 species, each requiring a network round trip plus a
deliberate rate-limiting delay, can easily take several minutes — far too
long to hold open a single HTTP request/response cycle. So the API kicks
the work off as a background asyncio task and hands back a job id
immediately; the client polls `GET /species/bulk-import/{job_id}` for
progress.

NOTE: this store is an in-memory dict, scoped to a single process. That's
fine for a single `uvicorn` worker (the common case for this app — see
Dockerfile), but if the API is ever run with multiple worker processes or
multiple replicas behind a load balancer, a job started on one worker
won't be visible from another. If that becomes a real deployment target,
swap this for a Redis- or DB-backed store; `run_bulk_import`'s
`on_progress` callback is already the only integration point that would
need to change.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import get_settings


@dataclass
class Job:
    id: str
    status: str = "queued"  # queued | running | completed | failed
    total: int = 0
    processed: int = 0
    created: int = 0
    linked: int = 0
    skipped: int = 0
    failed: int = 0
    invalid: int = 0
    items: list[dict[str, Any]] = field(default_factory=list)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None


class InMemoryJobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}

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

    def create(self) -> Job:
        self.purge_expired()
        job = Job(id=str(uuid.uuid4()), started_at=datetime.now(timezone.utc))
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)


job_store = InMemoryJobStore()