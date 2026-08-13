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
    result = ProviderResult("iucn", {
        "category": "VU",
        "population_trend": "Decreasing",
    })
    mapped = normalize_provider_result(result, "IucnClient")
    assert mapped["conservation"]["iucn_status"] == "VU"
    assert mapped["conservation"]["iucn_trend"] == "Decreasing"


def test_empty_result():
    result = ProviderResult("gbif", {})
    mapped = normalize_provider_result(result, "GbifClient")
    assert mapped["taxonomy"] == {}
    assert mapped["field_sources"] == {}
