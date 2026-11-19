"""Designations (Ramsar, UNESCO MAB, IBA...) on sites: admin-only writes, validation,
idempotency, ordering, and cleanup when the site is deleted."""
from app.models.site_designation import SiteDesignation


def _site(client, headers, code="DS"):
    r = client.post("/api/v1/sites", json={"name": f"Site {code}", "code": code}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _add(client, headers, site_id, designation_id):
    return client.post(
        f"/api/v1/sites/{site_id}/designations",
        json={"designation_id": designation_id},
        headers=headers,
    )


def test_catalog_is_listed_in_order(client, researcher_headers):
    r = client.get("/api/v1/designations", headers=researcher_headers)
    assert r.status_code == 200
    ids = [d["id"] for d in r.json()]
    assert ids == ["ramsar", "unesco-mab", "iba", "kba", "parc-national-el-kala"]
    assert r.json()[0]["icon"] == "/assets/designations/ramsar.svg"


def test_admin_adds_and_removes_designations(client, admin_headers):
    site_id = _site(client, admin_headers)

    r = _add(client, admin_headers, site_id, "kba")
    assert r.status_code == 201
    r = _add(client, admin_headers, site_id, "ramsar")
    assert r.status_code == 201
    # Sorted by catalog order, not by insertion order.
    assert [d["id"] for d in r.json()] == ["ramsar", "kba"]

    # Idempotent: already present -> 200, no duplicate.
    r = _add(client, admin_headers, site_id, "ramsar")
    assert r.status_code == 200
    assert [d["id"] for d in r.json()] == ["ramsar", "kba"]

    detail = client.get(f"/api/v1/sites/{site_id}", headers=admin_headers).json()
    assert [d["id"] for d in detail["designations"]] == ["ramsar", "kba"]
    listed = {s["id"]: s for s in client.get("/api/v1/sites", headers=admin_headers).json()}
    assert [d["id"] for d in listed[site_id]["designations"]] == ["ramsar", "kba"]
    assert listed[site_id]["designations"][0]["name_fr"].startswith("Site Ramsar")

    url = f"/api/v1/sites/{site_id}/designations/ramsar"
    assert client.delete(url, headers=admin_headers).status_code == 204
    assert client.delete(url, headers=admin_headers).status_code == 204  # idempotent
    detail = client.get(f"/api/v1/sites/{site_id}", headers=admin_headers).json()
    assert [d["id"] for d in detail["designations"]] == ["kba"]


def test_only_admins_can_change_designations(client, admin_headers, researcher_headers):
    site_id = _site(client, admin_headers)
    assert _add(client, admin_headers, site_id, "iba").status_code == 201

    assert _add(client, researcher_headers, site_id, "kba").status_code == 403
    url = f"/api/v1/sites/{site_id}/designations/iba"
    assert client.delete(url, headers=researcher_headers).status_code == 403

    # Not signed in: rejected before anything else (403 with this FastAPI version's
    # HTTPBearer, like every other endpoint of the API).
    assert _add(client, {}, site_id, "kba").status_code in (401, 403)
    assert client.delete(url).status_code in (401, 403)

    # Researchers can still read them.
    detail = client.get(f"/api/v1/sites/{site_id}", headers=researcher_headers).json()
    assert [d["id"] for d in detail["designations"]] == ["iba"]


def test_validation(client, admin_headers):
    site_id = _site(client, admin_headers)
    r = _add(client, admin_headers, site_id, "world-heritage")
    assert r.status_code == 400
    assert "Unknown designation" in r.json()["detail"]
    assert client.delete(
        f"/api/v1/sites/{site_id}/designations/world-heritage", headers=admin_headers
    ).status_code == 400
    assert _add(client, admin_headers, 999999, "ramsar").status_code == 404
    assert client.delete(
        "/api/v1/sites/999999/designations/ramsar", headers=admin_headers
    ).status_code == 404
    # Body is strict: the field is designation_id.
    r = client.post(
        f"/api/v1/sites/{site_id}/designations", json={"designationId": "ramsar"},
        headers=admin_headers,
    )
    assert r.status_code == 422


def test_designations_are_deleted_with_the_site(client, admin_headers, db_session):
    site_id = _site(client, admin_headers)
    for designation_id in ("ramsar", "iba"):
        assert _add(client, admin_headers, site_id, designation_id).status_code == 201
    assert db_session.query(SiteDesignation).filter_by(site_id=site_id).count() == 2

    assert client.delete(f"/api/v1/sites/{site_id}", headers=admin_headers).status_code == 200
    db_session.expire_all()
    assert db_session.query(SiteDesignation).filter_by(site_id=site_id).count() == 0
