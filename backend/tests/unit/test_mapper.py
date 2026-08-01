from app.integrations.base import ProviderResult
from app.integrations.mapper import merge_provider_results


def test_merge_prefers_powo_family_over_gbif():
    results = [
        ProviderResult(provider="gbif", found=True, raw_fields={"family": "Fabaceae"}, reference="123"),
        ProviderResult(provider="powo", found=True, raw_fields={"family": "Leguminosae"}, reference="456"),
    ]
    draft = merge_provider_results("Some plantus", results)

    assert draft.family == "Leguminosae"
    assert draft.field_sources["family"].source == "powo"


def test_merge_falls_back_when_preferred_provider_missing_field():
    results = [ProviderResult(provider="gbif", found=True, raw_fields={"family": "Felidae"}, reference="999")]
    draft = merge_provider_results("Panthera leo", results)

    assert draft.family == "Felidae"
    assert draft.field_sources["family"].source == "gbif"


def test_merge_leaves_field_none_when_no_provider_has_it():
    draft = merge_provider_results("Unknown species", [])
    assert draft.common_name is None
    assert "common_name" not in draft.field_sources
