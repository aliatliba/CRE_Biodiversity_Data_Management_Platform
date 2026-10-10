import asyncio
import time

from app.services import species_service


def _site(client, headers):
    return client.post("/api/v1/sites", json={"name": "LB", "code": "LB"}, headers=headers).json()


def test_batch_lookup_runs_with_bounded_concurrency_and_keeps_order(
    client, admin_headers, fake_providers, db_session
):
    site = _site(client, admin_headers)
    fake_providers.delay = 0.05
    names = [f"Genus sp{i}" for i in range(6)]
    seen: list[tuple[int, str]] = []

    async def on_progress(processed, total, item, index):
        seen.append((index, item["input_scientific_name"]))

    start = time.perf_counter()
    results = asyncio.run(
        species_service.lookup_species_batch(
            db_session, names, site["id"], delay_seconds=0, on_progress=on_progress, concurrency=3
        )
    )
    elapsed = time.perf_counter() - start

    assert [r["input_scientific_name"] for r in results] == names  # input order
    assert sorted(i for i, _ in seen) == list(range(6))
    # 6 species x 2 sequential provider rounds x 50 ms = 0.6 s sequentially; 3 workers ~0.2 s
    assert elapsed < 0.5
    assert all(r["error"] is None and r["draft"] is not None for r in results)


def test_batch_lookup_flags_existing_species(client, admin_headers, db_session):
    site = _site(client, admin_headers)
    client.post(
        "/api/v1/species",
        json={"scientific_name": "Felis catus", "site_id": site["id"]},
        headers=admin_headers,
    )
    results = asyncio.run(
        species_service.lookup_species_batch(
            db_session, ["felis catus"], site["id"], delay_seconds=0
        )
    )
    assert results[0]["duplicate"] is True
    assert results[0]["draft"] is None
    assert results[0]["existing_species"]["scientific_name"] == "Felis catus"


def test_batch_endpoint_job_roundtrip(client, admin_headers, fake_providers):
    site = _site(client, admin_headers)
    r = client.post(
        "/api/v1/species/lookup-batch",
        json={"scientific_names": ["Genus a", "genus A", "Genus b"], "site_id": site["id"]},
        headers=admin_headers,
    )
    assert r.status_code == 202
    assert r.json()["total"] == 2


def test_provider_results_are_cached(client, admin_headers, fake_providers):
    fake_providers.data["gbif"] = {"canonicalName": "Panthera leo", "kingdom": "Animalia"}
    for _ in range(2):
        r = client.post(
            "/api/v1/species/lookup",
            json={"scientific_name": "Panthera leo"},
            headers=admin_headers,
        )
        assert r.status_code == 200
    gbif_calls = [c for c in fake_providers.calls if c[0] == "gbif"]
    assert len(gbif_calls) == 1  # second lookup served from the cache


def test_errors_are_not_cached(client, admin_headers, fake_providers):
    fake_providers.errors["iucn"] = "boom"
    client.post("/api/v1/species/lookup", json={"scientific_name": "Panthera leo"}, headers=admin_headers)
    fake_providers.errors.clear()
    r = client.post(
        "/api/v1/species/lookup", json={"scientific_name": "Panthera leo"}, headers=admin_headers
    )
    assert r.json()["provider_errors"] == {}
    assert len([c for c in fake_providers.calls if c[0] == "iucn"]) == 2


def test_powo_skipped_for_non_plants(client, admin_headers, fake_providers):
    fake_providers.data["gbif"] = {"canonicalName": "Panthera leo", "kingdom": "Animalia"}
    client.post("/api/v1/species/lookup", json={"scientific_name": "Panthera leo"}, headers=admin_headers)
    assert not [c for c in fake_providers.calls if c[0] == "powo"]

    fake_providers.data["gbif"] = {"canonicalName": "Quercus suber", "kingdom": "Plantae"}
    client.post("/api/v1/species/lookup", json={"scientific_name": "Quercus suber"}, headers=admin_headers)
    assert [c for c in fake_providers.calls if c[0] == "powo"]
