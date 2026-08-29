from typing import Any
from app.integrations.base import ProviderResult


def normalize_provider_result(result: ProviderResult, provider_name: str) -> dict[str, Any]:
    data = result.data
    source_key = provider_name.replace("Client", "").lower()
    mapped: dict[str, Any] = {
        "taxonomy": {},
        "conservation": {},
        "traits": {},
        "field_sources": {},
    }

    def _set(section: str, key: str, value: Any, reference: str | None = None) -> None:
        if value is not None:
            mapped[section][key] = value
            mapped["field_sources"][key] = {
                "source": source_key,
                "reference": reference,
                "retrieved_at": None,
            }

    if "gbif" in source_key:
        _set("taxonomy", "kingdom", data.get("kingdom"))
        _set("taxonomy", "phylum", data.get("phylum"))
        _set("taxonomy", "class_name", data.get("class"))
        _set("taxonomy", "order_name", data.get("order"))
        _set("taxonomy", "family", data.get("family"))
        _set("taxonomy", "genus", data.get("genus"))
        _set("taxonomy", "species_epithet", data.get("specificEpithet"))
        _set("taxonomy", "common_name", data.get("vernacularName"))
        _set("conservation", "iucn_status", data.get("iucnRedListCategory"))

    elif "wikidata" in source_key:
        _set("taxonomy", "common_name", data.get("common_name"))
        _set("taxonomy", "kingdom", data.get("kingdom"))

    elif "iucn" in source_key:
        _set("conservation", "iucn_status", data.get("category"))
        _set("conservation", "iucn_trend", data.get("population_trend"))

    elif "powo" in source_key:
        _set("taxonomy", "family", data.get("family"))
        _set("taxonomy", "genus", data.get("genus"))
        _set("taxonomy", "species_epithet", data.get("speciesEpithet"))

    elif "inaturalist" in source_key:
        _set("taxonomy", "kingdom", data.get("kingdom"))
        _set("taxonomy", "class_name", data.get("class"))
        _set("taxonomy", "family", data.get("family"))
        _set("taxonomy", "common_name", data.get("common_name"))

    return mapped
