"""In-memory job registry for background biodiversity graphics generation."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class GraphicsJob:
    id: str
    graphic_type: str
    status: str = "queued"  # queued | running | completed | failed
    site_id: int | None = None
    site_name: str | None = None
    total_species: int = 0
    processed: int = 0
    files: dict[str, str] = field(default_factory=dict)  # format -> path
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None


class GraphicsJobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, GraphicsJob] = {}

    def create(self, graphic_type: str) -> GraphicsJob:
        job = GraphicsJob(
            id=str(uuid.uuid4()),
            graphic_type=graphic_type,
            started_at=datetime.now(timezone.utc),
        )
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> GraphicsJob | None:
        return self._jobs.get(job_id)


graphics_job_store = GraphicsJobStore()