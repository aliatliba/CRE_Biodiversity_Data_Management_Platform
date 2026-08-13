def test_create_site_requires_admin(client, admin_headers):
    resp = client.post("/api/v1/sites", json={
        "name": "Test Site",
        "code": "TS01",
    }, headers=admin_headers)
    assert resp.status_code == 201


def test_lookup_species(client, admin_headers):
    resp = client.post("/api/v1/species/lookup", json={
        "scientific_name": "Panthera leo",
    }, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["scientific_name"] == "Panthera leo"


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
