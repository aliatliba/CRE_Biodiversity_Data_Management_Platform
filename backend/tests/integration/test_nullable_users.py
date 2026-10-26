"""Rows keep existing after their author is deleted (FKs are ON DELETE SET NULL),
so response schemas must accept NULL user references."""
from sqlalchemy import text


def _make_site_and_species(client, headers):
    site = client.post(
        "/api/v1/sites", json={"name": "Null Site", "code": "NS"}, headers=headers
    ).json()
    species = client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus nullus", "site_id": site["id"]},
        headers=headers,
    ).json()
    return site, species


def test_endpoints_serialize_null_user_references(client, admin_headers, db_session):
    site, species = _make_site_and_species(client, admin_headers)

    db_session.execute(text("UPDATE sites SET created_by = NULL"))
    db_session.execute(text("UPDATE species SET created_by = NULL, validated_by = NULL"))
    db_session.execute(text("UPDATE species_validation_history SET validated_by = NULL"))
    db_session.execute(text("UPDATE site_species SET recorded_by = NULL"))
    db_session.commit()

    r = client.get(f"/api/v1/sites/{site['id']}", headers=admin_headers)
    assert r.status_code == 200 and r.json()["created_by"] is None

    r = client.get(f"/api/v1/species/{species['id']}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["created_by"] is None and r.json()["validated_by"] is None

    r = client.get("/api/v1/species", headers=admin_headers)
    assert r.status_code == 200 and r.json()["total"] == 1

    r = client.get(f"/api/v1/species/{species['id']}/history", headers=admin_headers)
    assert r.status_code == 200
    assert all(h["validated_by"] is None for h in r.json())

    r = client.get(f"/api/v1/sites/{site['id']}/species", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()[0]["recorded_by"] is None


def test_protected_species_with_null_adder(client, admin_headers, db_session):
    r = client.post(
        "/api/v1/protected-species",
        json={"scientific_name": "Genus protectus"},
        headers=admin_headers,
    )
    assert r.status_code == 201
    db_session.execute(text("UPDATE protected_species_list SET added_by = NULL"))
    db_session.commit()

    r = client.get("/api/v1/protected-species", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["items"][0]["added_by"] is None
