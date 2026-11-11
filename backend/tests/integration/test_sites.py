from app.models.site import Site
from app.models.site_species import SiteSpecies


def _site_with_species(client, headers):
    site = client.post(
        "/api/v1/sites", json={"name": "Del Site", "code": "DS"}, headers=headers
    ).json()
    client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus deletus", "site_id": site["id"]},
        headers=headers,
    )
    return site


def test_delete_site_with_associations_requires_force(client, admin_headers):
    site = _site_with_species(client, admin_headers)
    r = client.delete(f"/api/v1/sites/{site['id']}", headers=admin_headers)
    assert r.status_code == 409
    assert "force=true" in r.json()["detail"]


def test_force_delete_site_removes_associations(client, admin_headers, db_session):
    site = _site_with_species(client, admin_headers)
    r = client.delete(f"/api/v1/sites/{site['id']}?force=true", headers=admin_headers)
    assert r.status_code == 200

    assert db_session.query(Site).filter(Site.id == site["id"]).count() == 0
    assert db_session.query(SiteSpecies).filter(SiteSpecies.site_id == site["id"]).count() == 0
    assert client.get(f"/api/v1/sites/{site['id']}", headers=admin_headers).status_code == 404


def test_site_list_includes_species_counters(client, admin_headers):
    big = client.post("/api/v1/sites", json={"name": "B big"}, headers=admin_headers).json()
    small = client.post("/api/v1/sites", json={"name": "A small"}, headers=admin_headers).json()
    for name, site, iucn in [
        ("Genus unus", big, "EN"),
        ("Genus duo", big, None),
        ("Genus tres", big, None),
        ("Genus quattuor", small, "LC"),
    ]:
        r = client.post(
            "/api/v1/species",
            json={"scientific_name": name, "site_id": site["id"], "iucn_status": iucn},
            headers=admin_headers,
        )
        assert r.status_code == 201, r.text

    rows = {row["id"]: row for row in client.get("/api/v1/sites", headers=admin_headers).json()}
    assert rows[big["id"]]["species_count"] == 3
    assert rows[big["id"]]["species_share"] == 75.0
    assert rows[big["id"]]["threatened_count"] == 1
    assert rows[small["id"]]["species_share"] == 25.0
    # The list stays alphabetical (it feeds the site pickers); the Sites page re-sorts.
    names = [row["name"] for row in rows.values()]
    assert names == sorted(names)


def test_dashboard_site_stats_richest_first(client, admin_headers):
    test_site_list_includes_species_counters(client, admin_headers)
    stats = client.get("/api/v1/dashboard/stats", headers=admin_headers).json()
    counts = [row["species_count"] for row in stats["site_stats"]]
    assert counts == sorted(counts, reverse=True)
    shares = [row["percentage"] for row in stats["species_richness_by_site"]]
    assert shares == sorted(shares, reverse=True) and round(sum(shares)) == 100
    assert [row["species_share"] for row in stats["site_stats"]] == shares


def test_species_sites_lists_linked_sites(client, admin_headers):
    beta = client.post("/api/v1/sites", json={"name": "Beta", "code": "SB"}, headers=admin_headers).json()
    alpha = client.post("/api/v1/sites", json={"name": "Alpha", "code": "SA"}, headers=admin_headers).json()
    client.post("/api/v1/sites", json={"name": "Gamma"}, headers=admin_headers)
    species = client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus ubique", "site_id": beta["id"]},
        headers=admin_headers,
    ).json()
    r = client.post(
        f"/api/v1/sites/{alpha['id']}/species",
        json={"species_id": species["id"], "notes": "seen near the spring"},
        headers=admin_headers,
    )
    assert r.status_code == 201, r.text

    sites = client.get(f"/api/v1/species/{species['id']}/sites", headers=admin_headers).json()
    assert [(s["site_name"], s["site_code"]) for s in sites] == [("Alpha", "SA"), ("Beta", "SB")]
    assert sites[0]["notes"] == "seen near the spring" and sites[0]["recorded_at"]

    client.delete(f"/api/v1/sites/{alpha['id']}/species/{species['id']}", headers=admin_headers)
    sites = client.get(f"/api/v1/species/{species['id']}/sites", headers=admin_headers).json()
    assert [s["site_id"] for s in sites] == [beta["id"]]

    assert client.get("/api/v1/species/999999/sites", headers=admin_headers).status_code == 404
