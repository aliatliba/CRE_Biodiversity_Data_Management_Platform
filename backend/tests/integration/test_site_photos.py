"""Site landscape photos: admin-only writes, content validation, size limit, caching
headers, and cleanup when the site is deleted."""
from app.core.config import get_settings
from app.models.site_photo import SitePhoto

# Smallest byte strings the signature check accepts (the server never decodes them).
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 64


def _site(client, headers, code="PH"):
    r = client.post("/api/v1/sites", json={"name": f"Site {code}", "code": code}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _upload(client, headers, site_id, data, filename="photo.jpg", content_type="image/jpeg"):
    return client.put(
        f"/api/v1/sites/{site_id}/photo",
        files={"file": (filename, data, content_type)},
        headers=headers,
    )


def test_admin_sets_replaces_and_removes_photo(client, admin_headers, researcher_headers):
    site_id = _site(client, admin_headers)
    detail = client.get(f"/api/v1/sites/{site_id}", headers=admin_headers).json()
    assert detail["photo_updated_at"] is None
    assert client.get(f"/api/v1/sites/{site_id}/photo", headers=admin_headers).status_code == 404

    r = _upload(client, admin_headers, site_id, JPEG)
    assert r.status_code == 200, r.text
    first_version = r.json()["photo_updated_at"]
    assert first_version is not None

    # Readable by researchers; served with the sniffed type, not the client's.
    r = client.get(f"/api/v1/sites/{site_id}/photo", headers=researcher_headers)
    assert r.status_code == 200
    assert r.content == JPEG
    assert r.headers["content-type"] == "image/jpeg"
    assert r.headers["x-content-type-options"] == "nosniff"
    assert "no-cache" in r.headers["cache-control"]
    r = client.get(f"/api/v1/sites/{site_id}/photo?v={first_version}", headers=researcher_headers)
    assert "immutable" in r.headers["cache-control"]

    # Replacing keeps one photo and gives it a new version.
    r = _upload(client, admin_headers, site_id, PNG, filename="photo.jpg", content_type="image/jpeg")
    assert r.status_code == 200
    assert r.json()["photo_updated_at"] != first_version
    r = client.get(f"/api/v1/sites/{site_id}/photo", headers=admin_headers)
    assert r.content == PNG
    assert r.headers["content-type"] == "image/png"

    listed = {s["id"]: s for s in client.get("/api/v1/sites", headers=admin_headers).json()}
    assert listed[site_id]["photo_updated_at"] is not None

    url = f"/api/v1/sites/{site_id}/photo"
    assert client.delete(url, headers=admin_headers).status_code == 204
    assert client.delete(url, headers=admin_headers).status_code == 204  # idempotent
    assert client.get(url, headers=admin_headers).status_code == 404
    detail = client.get(f"/api/v1/sites/{site_id}", headers=admin_headers).json()
    assert detail["photo_updated_at"] is None


def test_webp_is_accepted(client, admin_headers):
    site_id = _site(client, admin_headers)
    assert _upload(client, admin_headers, site_id, WEBP, "p.webp", "image/webp").status_code == 200
    r = client.get(f"/api/v1/sites/{site_id}/photo", headers=admin_headers)
    assert r.headers["content-type"] == "image/webp"


def test_only_admins_can_change_photo(client, admin_headers, researcher_headers):
    site_id = _site(client, admin_headers)
    assert _upload(client, researcher_headers, site_id, JPEG).status_code == 403
    assert _upload(client, admin_headers, site_id, JPEG).status_code == 200
    url = f"/api/v1/sites/{site_id}/photo"
    assert client.delete(url, headers=researcher_headers).status_code == 403
    # Not signed in: not even readable.
    assert client.get(url).status_code in (401, 403)
    assert _upload(client, {}, site_id, JPEG).status_code in (401, 403)


def test_rejects_non_images_and_oversized_files(client, admin_headers, monkeypatch):
    site_id = _site(client, admin_headers)

    # Content decides, whatever the filename and Content-Type claim.
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    r = _upload(client, admin_headers, site_id, svg, "photo.jpg", "image/jpeg")
    assert r.status_code == 400
    assert "JPEG, PNG or WebP" in r.json()["detail"]
    assert _upload(client, admin_headers, site_id, b"").status_code == 400

    monkeypatch.setattr(get_settings(), "site_photo_max_bytes", 100)
    r = _upload(client, admin_headers, site_id, JPEG + b"\x00" * 100)
    assert r.status_code == 413
    detail = client.get(f"/api/v1/sites/{site_id}", headers=admin_headers).json()
    assert detail["photo_updated_at"] is None


def test_unknown_site(client, admin_headers):
    assert _upload(client, admin_headers, 999_999, JPEG).status_code == 404
    r = client.get("/api/v1/sites/999999/photo", headers=admin_headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "Site not found"
    assert client.delete("/api/v1/sites/999999/photo", headers=admin_headers).status_code == 404


def test_photo_is_removed_with_the_site(client, admin_headers, db_session):
    site_id = _site(client, admin_headers)
    assert _upload(client, admin_headers, site_id, JPEG).status_code == 200
    assert client.delete(f"/api/v1/sites/{site_id}", headers=admin_headers).status_code == 200
    db_session.expire_all()
    assert db_session.get(SitePhoto, site_id) is None
