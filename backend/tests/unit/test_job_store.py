from datetime import datetime, timedelta, timezone

import pytest

from app.core.exceptions import TooManyRequestsError, UserFacingError
from app.core.job_store import GraphicsJob, Job, JobStore, run_job


def test_finished_jobs_are_purged_on_create():
    store = JobStore(Job)
    old = store.create()
    old.finished_at = datetime.now(timezone.utc) - timedelta(hours=2)
    running = store.create()
    recent = store.create()
    recent.finished_at = datetime.now(timezone.utc)

    store.create()  # triggers purge

    assert store.get(old.id) is None
    assert store.get(running.id) is running
    assert store.get(recent.id) is recent


def test_graphics_jobs_are_purged_on_create():
    store = JobStore(GraphicsJob)
    old = store.create(graphic_type="dendrogram")
    old.finished_at = datetime.now(timezone.utc) - timedelta(hours=2)
    store.create(graphic_type="dendrogram")
    assert store.get(old.id) is None


async def test_run_job_success_and_failure():
    store = JobStore(Job)

    async def ok(db):
        assert db is not None

    job = store.create()
    await run_job(job, ok)
    assert job.status == "completed" and job.finished_at is not None and job.error is None

    async def boom(db):
        raise UserFacingError("kaput")

    failing = store.create()
    await run_job(failing, boom)
    assert failing.status == "failed" and failing.error == "kaput"
    assert failing.finished_at is not None


async def test_internal_errors_are_not_sent_to_clients():
    store = JobStore(Job)

    async def leak(db):
        raise RuntimeError("could not open /app/secret/path.xlsx")

    job = store.create()
    await run_job(job, leak)
    assert job.status == "failed"
    assert "/app/secret" not in job.error
    assert job.error.startswith("Unexpected server error (ref: ")


class _User:
    def __init__(self, id, role="researcher"):
        self.id = id
        self.role = type("R", (), {"name": role})()


def test_per_user_active_job_limit():
    store = JobStore(Job)
    first = store.create_for_user(1, "bulk_import")
    with pytest.raises(TooManyRequestsError):
        store.create_for_user(1, "bulk_import")
    store.create_for_user(1, "lookup_batch")  # other job types are counted separately
    store.create_for_user(2, "bulk_import")  # other users are not affected

    first.status = "completed"
    store.create_for_user(1, "bulk_import")  # finished jobs free the slot


def test_jobs_are_private_to_their_owner():
    store = JobStore(Job)
    job = store.create_for_user(1, "lookup_batch")
    assert store.get_for_user(job.id, _User(1)) is job
    assert store.get_for_user(job.id, _User(2)) is None
    assert store.get_for_user(job.id, _User(2, role="admin")) is job
