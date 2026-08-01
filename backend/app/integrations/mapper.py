"""Normalizes and merges multiple ExternalProviderClient results into one
SpeciesDraft, applying the per-field-type authority recommended in README
Section 13.1:

- Taxonomy            -> GBIF (fallback: POWO overrides for plants)
- Common name         -> Wikidata
- Conservation status -> IUCN

If a preferred provider didn't return a field, the next provider that did
is used instead, so the draft is as complete as possible without ever
inventing data. Fields no provider returned are left None for the
researcher to fill in manually.
"""
from datetime import datetime, timezone

from app.integrations.base import ProviderResult
from app.schemas.species import FieldSourceEntry, SpeciesDraft

# Preference order per field: first provider in the list wins if it has the field.
FIELD_PROVIDER_PRIORITY: dict[str, list[str]] = {
    "kingdom": ["gbif"],
    "class_name": ["gbif"],
    "order_name": ["gbif"],
    "family": ["powo", "gbif"],
    "genus": ["powo", "gbif"],
    "species_epithet": ["powo", "gbif"],
    "common_name": ["wikidata", "inaturalist"],
    "iucn_status": ["iucn"],
    "iucn_trend": ["iucn"],
}


def merge_provider_results(scientific_name: str, results: list[ProviderResult]) -> SpeciesDraft:
    results_by_provider = {r.provider: r for r in results if r.found}
    draft = SpeciesDraft(scientific_name=scientific_name)
    now = datetime.now(timezone.utc)

    for field_name, provider_priority in FIELD_PROVIDER_PRIORITY.items():
        for provider_name in provider_priority:
            result = results_by_provider.get(provider_name)
            if result is None:
                continue
            value = result.raw_fields.get(field_name)
            if value is None:
                continue
            setattr(draft, field_name, value)
            draft.field_sources[field_name] = FieldSourceEntry(
                source=provider_name,  # type: ignore[arg-type]
                reference=result.reference,
                retrieved_at=now,
            )
            break  # first provider in priority order that had this field wins

    return draft
