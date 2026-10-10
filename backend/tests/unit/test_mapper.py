from app.integrations.base import ProviderResult
from app.integrations.mapper import normalize_provider_result


def test_gbif_normalization():
    result = ProviderResult("gbif", {
        "kingdom": "Animalia",
        "class": "Mammalia",
        "order": "Carnivora",
        "family": "Felidae",
        "genus": "Panthera",
        "specificEpithet": "leo",
        "vernacularName": "Lion",
    })
    mapped = normalize_provider_result(result, "GbifClient")
    assert mapped["taxonomy"]["kingdom"] == "Animalia"
    assert mapped["taxonomy"]["class_name"] == "Mammalia"
    assert mapped["taxonomy"]["species_epithet"] == "leo"
    assert mapped["field_sources"]["kingdom"]["source"] == "gbif"


def test_iucn_normalization():
    assessments = [
        {
            "assessment_id": 1,
            "scope": "Global",
            "scope_code": "1",
            "year": 2020,
            "category": "VU",
            "population_trend": "Decreasing",
        }
    ]
    result = ProviderResult("iucn", {"assessments": assessments})
    mapped = normalize_provider_result(result, "IucnClient")
    assert mapped["conservation"]["iucn_assessments"] == assessments
    assert mapped["field_sources"]["iucn_assessments"]["source"] == "iucn"


def test_empty_result():
    result = ProviderResult("gbif", {})
    mapped = normalize_provider_result(result, "GbifClient")
    assert mapped["taxonomy"] == {}
    assert mapped["field_sources"] == {}
