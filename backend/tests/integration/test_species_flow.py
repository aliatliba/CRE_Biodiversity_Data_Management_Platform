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
