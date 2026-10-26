import asyncio

import pytest

from app.api import graphics as graphics_api
from app.core import job_store
from app.core.job_store import graphics_job_store
from app.scripts.graphics_registry import get_spec
from app.services import graphics_service


@pytest.fixture
def job_db(db_session, monkeypatch):
    """Background jobs open their own session; point them at the test transaction."""
    monkeypatch.setattr(job_store, "SessionLocal", lambda: db_session)
    return db_session


@pytest.fixture
def fake_r(monkeypatch, tmp_path, db_session):
    calls = []

    async def run_r_script(spec, input_excel, output_dir):
        # (R got its Excel input, the job still holds a DB transaction while R runs)
        calls.append((input_excel.exists(), db_session.in_transaction()))
        output_dir.mkdir(parents=True, exist_ok=True)
        files = {}
        for fmt in spec.formats:
            path = output_dir / f"{spec.output_basename}.{fmt}"
            path.write_bytes(b"fake")
            files[fmt] = path
        return files

    monkeypatch.setattr(graphics_service, "run_r_script", run_r_script)
    monkeypatch.setattr(graphics_service, "GRAPHICS_DIR", tmp_path)
    return calls


def _site_with_iucn_species(client, headers):
    site = client.post("/api/v1/sites", json={"name": "Graph", "code": "GR"}, headers=headers)
    site = site.json()
    client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus graphicus", "iucn_status": "VU", "site_id": site["id"]},
        headers=headers,
    )
    return site


def test_graphics_job_completes_and_releases_the_session(
    client, admin_headers, admin_user, job_db, fake_r
):
    site = _site_with_iucn_species(client, admin_headers)
    job = graphics_job_store.create_for_user(admin_user.id, "graphics", graphic_type="iucn")

    asyncio.run(graphics_api._execute_graphics_job(job, site["id"], get_spec("iucn")))

    assert job.status == "completed", job.error
    assert job.total_species == 1
    assert set(job.files) == {"png", "tiff", "pdf"}
    assert fake_r == [(True, False)]  # input written; DB connection released before R


def test_graphics_job_reports_a_readable_error(client, admin_headers, admin_user, job_db, fake_r):
    site = client.post(
        "/api/v1/sites", json={"name": "Empty", "code": "EM"}, headers=admin_headers
    ).json()
    job = graphics_job_store.create_for_user(admin_user.id, "graphics", graphic_type="iucn")

    asyncio.run(graphics_api._execute_graphics_job(job, site["id"], get_spec("iucn")))

    assert job.status == "failed"
    assert "no validated species" in job.error
    assert fake_r == []


def test_graphics_queue_is_capped(client, admin_headers, admin_user, monkeypatch):
    site = client.post(
        "/api/v1/sites", json={"name": "Queue", "code": "QU"}, headers=admin_headers
    ).json()
    monkeypatch.setattr(graphics_api, "spawn", lambda coro: coro.close())

    first = client.post(
        "/api/v1/graphics/jobs", json={"site_id": site["id"], "graphic_type": "iucn"},
        headers=admin_headers,
    )
    assert first.status_code == 202
    again = client.post(
        "/api/v1/graphics/jobs", json={"site_id": site["id"], "graphic_type": "iucn"},
        headers=admin_headers,
    )
    assert again.status_code == 429
    graphics_job_store.get(first.json()["job_id"]).status = "completed"
