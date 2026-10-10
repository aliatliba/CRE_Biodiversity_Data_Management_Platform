"""Protected-list changes must keep Species.national_status in sync."""
from app.models.protected_species import ProtectedSpeciesList
from app.models.species import Species


def _create_species(client, headers, name="Felis silvestris"):
    site = client.post(
        "/api/v1/sites", json={"name": "PS Site", "code": "PS"}, headers=headers
    ).json()
    return client.post(
        "/api/v1/species", json={"scientific_name": name, "site_id": site["id"]}, headers=headers
    ).json()


def test_adding_and_removing_protected_entry_updates_species(client, admin_headers, db_session):
    species = _create_species(client, admin_headers)
    assert species["national_status"] == "Non Protected"

    # different case on purpose: matching is case-insensitive
    r = client.post(
        "/api/v1/protected-species",
        json={"scientific_name": "felis SILVESTRIS"},
        headers=admin_headers,
    )
    assert r.status_code == 201
    entry_id = r.json()["id"]

    r = client.get(f"/api/v1/species/{species['id']}", headers=admin_headers)
    assert r.json()["national_status"] == "Protected"

    assert client.delete(f"/api/v1/protected-species/{entry_id}", headers=admin_headers).status_code == 200
    r = client.get(f"/api/v1/species/{species['id']}", headers=admin_headers)
    assert r.json()["national_status"] == "Non Protected"


def test_new_species_picks_up_existing_protected_entry(client, admin_headers):
    client.post(
        "/api/v1/protected-species", json={"scientific_name": "Genus rarus"}, headers=admin_headers
    )
    species = _create_species(client, admin_headers, "genus RARUS")
    assert species["national_status"] == "Protected"


def test_seed_inserts_only_missing_names(db_session):
    from app.main import PROTECTED_SPECIES_SEED_FILE, seed_protected_species  # noqa: F401
    from app.models.role import Role
    from app.models.user import User

    import json

    seed = json.load(open(PROTECTED_SPECIES_SEED_FILE, encoding="utf-8"))
    names = {item["scientific_name"].strip().lower() for item in seed}
    assert "assistants sociaux" not in names

    role = Role(name="admin", description="a")
    db_session.add(role)
    db_session.flush()
    admin = User(email="seed@test.local", hashed_password="x", full_name="s", role_id=role.id)
    db_session.add(admin)
    db_session.flush()

    # One name pre-exists (different case) -> the seed must still run and add the rest.
    first = seed[0]["scientific_name"]
    db_session.add(ProtectedSpeciesList(scientific_name=first.upper(), added_by=admin.id))
    db_session.flush()

    seed_protected_species(db_session, admin)
    seed_protected_species(db_session, admin)  # idempotent

    assert db_session.query(ProtectedSpeciesList).count() == len(names)
    db_session.query(Species).count()  # session still healthy
