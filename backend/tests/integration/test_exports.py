import csv
import io

import pytest

from app.models.export import Export
from app.services import export_service


@pytest.fixture(autouse=True)
def _exports_tmp_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(export_service, "EXPORTS_DIR", str(tmp_path))


def _seed_species(client, headers):
    site = client.post(
        "/api/v1/sites", json={"name": "Exp Site", "code": "EX"}, headers=headers
    ).json()
    client.post(
        "/api/v1/species",
        json={"scientific_name": "Genus exportus", "site_id": site["id"]},
        headers=headers,
    )
    return site


@pytest.mark.parametrize("fmt", ["csv", "xlsx"])
def test_export_with_date_filters(client, admin_headers, db_session, fmt):
    _seed_species(client, admin_headers)

    r = client.post(
        "/api/v1/exports",
        json={
            "format": fmt,
            "filters": {
                "date_from": "2020-01-01T00:00:00Z",
                "date_to": "2099-01-01T00:00:00Z",
            },
        },
        headers=admin_headers,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "done"
    # datetimes were stored in the JSONB column as ISO strings
    stored = db_session.get(Export, body["id"]).filters
    assert stored == {
        "date_from": "2020-01-01T00:00:00Z",
        "date_to": "2099-01-01T00:00:00Z",
    }

    dl = client.get(f"/api/v1/exports/{body['id']}/download", headers=admin_headers)
    assert dl.status_code == 200
    if fmt == "csv":
        rows = list(csv.reader(io.StringIO(dl.content.decode("utf-8-sig"))))
        assert any("Genus exportus" in row for row in rows)


def test_export_date_filter_excludes_rows(client, admin_headers):
    _seed_species(client, admin_headers)
    r = client.post(
        "/api/v1/exports",
        json={"format": "csv", "filters": {"date_to": "2000-01-01T00:00:00Z"}},
        headers=admin_headers,
    )
    assert r.status_code == 201, r.text
    dl = client.get(f"/api/v1/exports/{r.json()['id']}/download", headers=admin_headers)
    rows = list(csv.reader(io.StringIO(dl.content.decode("utf-8-sig"))))
    assert len(rows) == 1  # header only
