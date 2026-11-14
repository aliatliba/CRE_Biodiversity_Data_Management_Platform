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


def species_site(client, headers):
    return client.get("/api/v1/sites", headers=headers).json()[0]["id"]


def _make_admin(db_session):
    from app.models.role import Role
    from app.models.user import User

    role = Role(name="admin", description="a")
    db_session.add(role)
    db_session.flush()
    admin = User(email="seed@test.local", hashed_password="x", full_name="s", role_id=role.id)
    db_session.add(admin)
    db_session.flush()
    return admin


def _decree_item(name, *synonyms, printed=None):
    return {
        "scientific_name": name,
        "kingdom": "Animalia",
        "taxon_group": "Mammals",
        "family": None,
        "common_name_fr": "Nom",
        "common_name_ar": None,
        "verification_status": "OK" if not synonyms else "Outdated",
        "verification_note": None,
        "decree": "12-235",
        "source_reference": "Décret exécutif n° 12-235",
        "printed_names": [printed or name],
        "names": [name, *synonyms],
    }


def _write_seed(tmp_path, monkeypatch, items):
    import json

    from app.services import protected_species_service

    path = tmp_path / "seed.json"
    path.write_text(json.dumps(items), encoding="utf-8")
    monkeypatch.setattr(protected_species_service, "DECREE_SEED_FILE", path)


def test_decree_seed_file_is_consistent():
    import json

    from app.services.protected_species_service import DECREE_SEED_FILE

    seed = json.load(open(DECREE_SEED_FILE, encoding="utf-8"))
    assert len(seed) > 900
    keys = [item["scientific_name"].lower() for item in seed]
    assert len(keys) == len(set(keys))
    match_names = [n.lower() for item in seed for n in item["names"]]
    assert len(match_names) == len(set(match_names))  # one taxon per name
    for item in seed:
        assert item["scientific_name"] in item["names"]
        assert item["decree"] in ("12-03", "12-235")
        assert "?" not in item["scientific_name"]


def test_decree_sync_inserts_updates_and_removes(db_session, tmp_path, monkeypatch):
    from app.models.protected_species import ProtectedSpeciesName
    from app.services.protected_species_service import sync_decree_list

    admin = _make_admin(db_session)
    old = Species(scientific_name="Felis libyca", national_status="Non Protected")
    gone = Species(scientific_name="Genus obsoletus", national_status="Protected")
    db_session.add_all([old, gone])
    # An administrator entry that the decree list now covers is replaced by it.
    manual = ProtectedSpeciesList(scientific_name="Felis libyca", added_by=admin.id)
    manual.names.append(ProtectedSpeciesName(name="Felis libyca", kind="match"))
    db_session.add(manual)
    db_session.flush()

    _write_seed(tmp_path, monkeypatch, [
        _decree_item("Felis lybica", "Felis libyca", printed="Felis libyca"),
        _decree_item("Genus obsoletus"),
    ])
    assert sync_decree_list(db_session, admin.id) is True
    assert sync_decree_list(db_session, admin.id) is False  # idempotent

    entries = db_session.query(ProtectedSpeciesList).order_by(ProtectedSpeciesList.id).all()
    assert [e.scientific_name for e in entries] == ["Felis lybica", "Genus obsoletus"]
    db_session.refresh(old)
    assert old.national_status == "Protected"  # recorded under the old spelling

    # Dropped from the decree file: removed, and the species loses its status.
    _write_seed(tmp_path, monkeypatch, [
        _decree_item("Felis lybica", "Felis libyca", "Felis silvestris lybica"),
    ])
    assert sync_decree_list(db_session, admin.id) is True
    assert [e.scientific_name for e in db_session.query(ProtectedSpeciesList)] == ["Felis lybica"]
    db_session.refresh(gone)
    assert gone.national_status == "Non Protected"
    names = {n.name for n in db_session.query(ProtectedSpeciesName).filter_by(kind="match")}
    assert names == {"Felis lybica", "Felis libyca", "Felis silvestris lybica"}


def test_synonym_marks_species_protected(client, admin_headers, db_session):
    from app.models.protected_species import ProtectedSpeciesName

    entry = ProtectedSpeciesList(scientific_name="Myotis zenatius", decree="12-235")
    entry.names += [
        ProtectedSpeciesName(name="Myotis zenatius", kind="match"),
        ProtectedSpeciesName(name="Myotis nattereri", kind="match"),
        ProtectedSpeciesName(name="Myotis natereri", kind="printed"),
    ]
    db_session.add(entry)
    db_session.commit()

    species = _create_species(client, admin_headers, "Myotis nattereri")
    assert species["national_status"] == "Protected"
    # a printed (garbled) name never marks a species
    garbled = client.post(
        "/api/v1/species",
        json={"scientific_name": "Myotis natereri", "site_id": species_site(client, admin_headers)},
        headers=admin_headers,
    ).json()
    assert garbled["national_status"] == "Non Protected"

    # Search finds the entry by any of its names; the recorded synonym is linked.
    page = client.get(
        "/api/v1/protected-species?search=nattereri", headers=admin_headers
    ).json()
    assert [e["scientific_name"] for e in page["items"]] == ["Myotis zenatius"]
    item = page["items"][0]
    assert item["synonyms"] == ["Myotis nattereri"]
    assert item["printed_names"] == ["Myotis natereri"]
    assert item["recorded_species_id"] == species["id"]

    # Decree entries cannot be removed, and their names cannot be added again.
    r = client.delete(f"/api/v1/protected-species/{item['id']}", headers=admin_headers)
    assert r.status_code == 400
    r = client.post(
        "/api/v1/protected-species", json={"scientific_name": "MYOTIS nattereri"},
        headers=admin_headers,
    )
    assert r.status_code == 409 and "Myotis zenatius" in r.json()["detail"]


def test_filter_by_taxon_group(client, admin_headers):
    for name, group in (("Genus avis", "Birds"), ("Genus planta", "Flowering plants")):
        client.post(
            "/api/v1/protected-species",
            json={"scientific_name": name, "taxon_group": group},
            headers=admin_headers,
        )
    r = client.get("/api/v1/protected-species?taxon_group=Birds", headers=admin_headers).json()
    assert [e["scientific_name"] for e in r["items"]] == ["Genus avis"]
    groups = client.get("/api/v1/protected-species/groups", headers=admin_headers).json()
    assert {g["taxon_group"]: g["count"] for g in groups} == {"Birds": 1, "Flowering plants": 1}


def test_protected_list_shows_iucn_status_and_paginates(client, admin_headers):
    site = client.post(
        "/api/v1/sites", json={"name": "Iucn Site", "code": "IU"}, headers=admin_headers
    ).json()
    for name in ("Genus alpha", "Genus beta", "Genus gamma"):
        client.post("/api/v1/protected-species", json={"scientific_name": name}, headers=admin_headers)
    client.post(
        "/api/v1/species",
        json={"scientific_name": "genus BETA", "iucn_status": "EN", "site_id": site["id"]},
        headers=admin_headers,
    )

    page1 = client.get(
        "/api/v1/protected-species?search=Genus&page=1&page_size=2", headers=admin_headers
    ).json()
    assert page1["total"] == 3 and page1["pages"] == 2
    assert [e["scientific_name"] for e in page1["items"]] == ["Genus alpha", "Genus beta"]
    assert [e["iucn_status"] for e in page1["items"]] == [None, "EN"]  # matched case-insensitively

    page2 = client.get(
        "/api/v1/protected-species?search=Genus&page=2&page_size=2", headers=admin_headers
    ).json()
    assert [e["scientific_name"] for e in page2["items"]] == ["Genus gamma"]

