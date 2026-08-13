from datetime import datetime, timezone


def test_create_and_update_species(client, admin_headers, db_session):
    site = client.post("/api/v1/sites", json={
        "name": "Val Site",
        "code": "VS",
    }, headers=admin_headers).json()

    species = client.post("/api/v1/species", json={
        "scientific_name": "Felis catus",
        "site_id": site["id"],
    }, headers=admin_headers).json()

    updated_at = species["updated_at"]
    patch = client.patch(f"/api/v1/species/{species['id']}", json={
        "guild": "Predator",
        "updated_at": updated_at,
    }, headers=admin_headers)
    assert patch.status_code == 200
    assert patch.json()["guild"] == "Predator"

    history = client.get(f"/api/v1/species/{species['id']}/history", headers=admin_headers)
    assert history.status_code == 200
    assert len(history.json()) == 2


def test_optimistic_concurrency(client, admin_headers):
    site = client.post("/api/v1/sites", json={
        "name": "OC Site",
        "code": "OCS",
    }, headers=admin_headers).json()

    species = client.post("/api/v1/species", json={
        "scientific_name": "Canis lupus",
        "site_id": site["id"],
    }, headers=admin_headers).json()

    patch = client.patch(f"/api/v1/species/{species['id']}", json={
        "guild": "Carnivore",
        "updated_at": "2020-01-01T00:00:00+00:00",
    }, headers=admin_headers)
    assert patch.status_code == 409
