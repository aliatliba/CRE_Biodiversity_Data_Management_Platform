from datetime import datetime, timedelta, timezone

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
        raise ValueError("kaput")

    failing = store.create()
    await run_job(failing, boom)
    assert failing.status == "failed" and failing.error == "kaput"
    assert failing.finished_at is not None
