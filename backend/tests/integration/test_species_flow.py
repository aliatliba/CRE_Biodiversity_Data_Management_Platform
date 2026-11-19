def test_create_site_requires_admin(client, admin_headers):
    resp = client.post("/api/v1/sites", json={
        "name": "Test Site",
        "code": "TS01",
    }, headers=admin_headers)
    assert resp.status_code == 201


def test_lookup_species(client, admin_headers, fake_providers):
    fake_providers.data["gbif"] = {
        "canonicalName": "Panthera leo",
        "kingdom": "Animalia",
        "family": "Felidae",
    }
    fake_providers.data["iucn"] = {
        "assessments": [
            {"assessment_id": 1, "scope": "Global", "year": 2016, "category": "VU"}
        ]
    }
    resp = client.post(
        "/api/v1/species/lookup", json={"scientific_name": "Panthera leo"}, headers=admin_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["scientific_name"] == "Panthera leo"
    assert data["taxonomy"]["family"] == "Felidae"
    assert data["conservation"]["iucn_assessments"][0]["category"] == "VU"
    assert data["provider_errors"] == {}
    assert data["national_status"] == "Non Protected"


def test_lookup_reports_provider_errors(client, admin_headers, fake_providers):
    fake_providers.errors["iucn"] = "IUCN API token is not configured"
    resp = client.post(
        "/api/v1/species/lookup", json={"scientific_name": "Panthera leo"}, headers=admin_headers
    )
    assert resp.status_code == 200
    assert resp.json()["provider_errors"] == {"iucn": "IUCN API token is not configured"}


def test_duplicate_detection(client, admin_headers, db_session):
    site_resp = client.post("/api/v1/sites", json={
        "name": "Site A",
        "code": "SA",
    }, headers=admin_headers)
    site_id = site_resp.json()["id"]

    resp = client.post("/api/v1/species", json={
        "scientific_name": "Panthera leo",
        "site_id": site_id,
    }, headers=admin_headers)
    assert resp.status_code == 201

    check = client.get("/api/v1/species/check?scientific_name=Panthera leo", headers=admin_headers)
    assert check.status_code == 200
    assert check.json()["exists"] is True

    resp2 = client.post("/api/v1/species", json={
        "scientific_name": "Panthera leo",
        "site_id": site_id,
    }, headers=admin_headers)
    assert resp2.status_code == 409


def test_species_list_has_class_and_cites(client, admin_headers):
    site = client.post(
        "/api/v1/sites", json={"name": "Cites Site", "code": "CI"}, headers=admin_headers
    ).json()
    for name, class_name in (("Tyto alba", "Aves"), ("Passer domesticus", "Aves")):
        r = client.post(
            "/api/v1/species",
            json={"scientific_name": name, "class_name": class_name, "site_id": site["id"]},
            headers=admin_headers,
        )
        assert r.status_code == 201, r.text
    items = client.get("/api/v1/species?search=a", headers=admin_headers).json()["items"]
    rows = {i["scientific_name"]: i for i in items}
    assert rows["Tyto alba"]["cites"] is True
    assert rows["Passer domesticus"]["cites"] is False
    assert rows["Tyto alba"]["class_name"] == "Aves"


def test_cites_filter_matches_flag(client, admin_headers):
    site = client.post(
        "/api/v1/sites", json={"name": "Cites Filter", "code": "CF"}, headers=admin_headers
    ).json()
    names = [
        "Tyto alba",  # listed
        "Aquila fasciata",  # synonym of a listed name
        "Anacamptis morio subsp. longicornu",  # subspecies of a listed species
        "Cervus elaphus",  # only a subspecies is listed
        "Passer domesticus",
    ]
    for name in names:
        r = client.post(
            "/api/v1/species", json={"scientific_name": name, "site_id": site["id"]},
            headers=admin_headers,
        )
        assert r.status_code == 201, r.text

    def listed(flag):
        url = f"/api/v1/species?site_id={site['id']}&cites={flag}&page_size=100"
        return {i["scientific_name"]: i["cites"] for i in client.get(url, headers=admin_headers).json()["items"]}

    only_cites = listed("true")
    assert set(only_cites) == {"Tyto alba", "Aquila fasciata", "Anacamptis morio subsp. longicornu"}
    assert all(only_cites.values())
    not_cites = listed("false")
    assert set(not_cites) == {"Cervus elaphus", "Passer domesticus"}
    assert not any(not_cites.values())
