def _seed(client, headers):
    s1 = client.post("/api/v1/sites", json={"name": "Alpha", "code": "A"}, headers=headers).json()
    client.post("/api/v1/sites", json={"name": "Empty", "code": "E"}, headers=headers)
    for name, status in [("Genus one", "CR"), ("Genus two", None), ("Genus three", "LC")]:
        client.post(
            "/api/v1/species",
            json={
                "scientific_name": name,
                "site_id": s1["id"],
                "iucn_status": status,
                "kingdom": "Animalia",
                "class_name": "c",
                "order_name": "o",
                "family": "F",
                "genus": "Genus",
            },
            headers=headers,
        )
    return s1


def test_dashboard_stats_grouped(client, admin_headers):
    site = _seed(client, admin_headers)
    r = client.get("/api/v1/dashboard/stats", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total_species"] == 3 and data["total_sites"] == 2
    assert data["iucn_breakdown"] == {"CR": 1, "NE": 1, "LC": 1}  # no "Unknown"
    assert data["iucn_threatened_species"] == 1
    by_name = {s["site_name"]: s for s in data["site_stats"]}
    assert by_name["Alpha"]["species_count"] == 3 and by_name["Alpha"]["complete_count"] == 2
    assert by_name["Empty"]["species_count"] == 0
    assert "total_associations" not in data and "completeness_breakdown" not in data

    scoped = client.get(f"/api/v1/dashboard/stats?site_id={site['id']}", headers=admin_headers).json()
    assert scoped["site"]["name"] == "Alpha" and scoped["site_stats"] == []


def test_dashboard_include_extra(client, admin_headers):
    _seed(client, admin_headers)
    data = client.get("/api/v1/dashboard/stats?include_extra=true", headers=admin_headers).json()
    assert data["total_associations"] == 3
    assert data["completeness_breakdown"] == {
        "complete": 2,
        "missing_taxonomy": 0,
        "missing_conservation": 1,
    }
    assert data["validations_last_30_days"] == 3


def test_dashboard_unknown_site_404(client, admin_headers):
    assert client.get("/api/v1/dashboard/stats?site_id=9999", headers=admin_headers).status_code == 404


def test_species_list_is_slim(client, admin_headers):
    _seed(client, admin_headers)
    item = client.get("/api/v1/species", headers=admin_headers).json()["items"][0]
    assert set(item) == {
        "id", "scientific_name", "common_name", "family", "kingdom", "iucn_status", "national_status"
    }
    q = client.get("/api/v1/species?search=THREE", headers=admin_headers).json()
    assert [i["scientific_name"] for i in q["items"]] == ["Genus three"]
