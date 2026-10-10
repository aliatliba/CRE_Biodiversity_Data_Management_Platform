from datetime import datetime, timedelta, timezone

from app.core.graphics_job_store import GraphicsJobStore
from app.core.job_store import InMemoryJobStore


def test_finished_jobs_are_purged_on_create():
    store = InMemoryJobStore()
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
    store = GraphicsJobStore()
    old = store.create("dendrogram")
    old.finished_at = datetime.now(timezone.utc) - timedelta(hours=2)
    store.create("dendrogram")
    assert store.get(old.id) is None
