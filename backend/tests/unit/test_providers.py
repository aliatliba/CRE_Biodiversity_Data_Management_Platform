import httpx
import pytest

from app.core.config import Settings
from app.integrations import base
from app.integrations.gbif_client import GbifClient
from app.integrations.inaturalist_client import InaturalistClient
from app.integrations.mapper import normalize_provider_result
from app.services.bulk_import_service import _draft_to_species_create, _pick_iucn_assessment


@pytest.fixture
def mock_http(monkeypatch):
    """Route provider HTTP calls to a handler instead of the network."""
    routes: dict[str, dict] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        for path, body in routes.items():
            if request.url.path.endswith(path):
                return httpx.Response(200, json=body)
        return httpx.Response(404, json={})

    monkeypatch.setattr(
        base, "_http_client", httpx.AsyncClient(transport=httpx.MockTransport(handler))
    )
    return routes


async def test_gbif_genus_only_match_is_not_used(mock_http):
    # Real GBIF answer for the typo "Quercus xyzabc".
    mock_http["/species/match"] = {
        "matchType": "HIGHERRANK", "canonicalName": "Quercus", "rank": "GENUS",
        "kingdom": "Plantae", "genus": "Quercus",
    }
    result = await GbifClient().search("Quercus xyzabc")
    assert result.data == {} and result.error is None


async def test_gbif_exact_match_is_used(mock_http):
    mock_http["/species/match"] = {
        "matchType": "EXACT", "canonicalName": "Panthera leo", "kingdom": "Animalia",
    }
    result = await GbifClient().search("Panthera leo")
    assert result.data["canonicalName"] == "Panthera leo"


async def test_inaturalist_needs_an_exact_species_match(mock_http):
    mock_http["/taxa"] = {
        "results": [
            {"id": 1, "name": "Panthera", "rank": "genus", "preferred_common_name": "Big cats"},
            {"id": 2, "name": "Panthera leo", "rank": "species", "preferred_common_name": "Lion"},
        ]
    }
    result = await InaturalistClient().search("Panthera leo")
    assert result.data == {"common_name": "Lion", "taxon_id": 2}
    mapped = normalize_provider_result(result, "InaturalistClient")
    assert mapped["taxonomy"] == {"common_name": "Lion"}
    assert mapped["field_sources"]["common_name"]["reference"].endswith("/taxa/2")


def test_bulk_import_takes_the_global_iucn_assessment():
    assessments = [
        {"scope": "Mediterranean", "category": "EN", "population_trend": "Decreasing",
         "assessment_id": 2},
        {"scope": "Global", "category": "VU", "population_trend": "Stable", "assessment_id": 1},
    ]
    assert _pick_iucn_assessment(assessments)["scope"] == "Global"

    data = _draft_to_species_create(
        {
            "scientific_name": "Panthera leo",
            "taxonomy": {"kingdom": "Animalia"},
            "conservation": {"iucn_assessments": assessments},
            "field_sources": {},
        },
        site_id=1,
    )
    assert data.iucn_status == "VU" and data.iucn_trend == "Stable"
    assert data.field_sources["iucn_status"]["assessment_id"] == 1


def test_bulk_import_falls_back_to_regional_assessment():
    assessments = [{"scope": "Europe", "category": "NT", "assessment_id": 3}]
    assert _pick_iucn_assessment(assessments)["category"] == "NT"
    assert _pick_iucn_assessment([]) is None


@pytest.mark.parametrize("secret", ["change-me-in-production", "short"])
def test_weak_jwt_secret_is_refused_outside_development(secret):
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        Settings(environment="production", jwt_secret_key=secret)


def test_weak_jwt_secret_is_allowed_in_development():
    assert Settings(environment="development", jwt_secret_key="change-me").debug is False
