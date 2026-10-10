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
