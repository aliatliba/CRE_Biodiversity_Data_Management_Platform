import httpx

from app.core.config import settings
from app.integrations.base import ExternalProviderClient, ProviderResult

GBIF_MATCH_URL = "https://api.gbif.org/v1/species/match"


class GbifClient(ExternalProviderClient):
    """GBIF backbone taxonomy — recommended authoritative source for taxonomy
    (except plants, where POWO takes precedence). See README Section 13.1.
    """

    provider_name = "gbif"

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
                response = await client.get(GBIF_MATCH_URL, params={"name": scientific_name})
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            return ProviderResult(provider=self.provider_name, found=False, error=str(exc))

        if data.get("matchType") == "NONE":
            return ProviderResult(provider=self.provider_name, found=False)

        raw_fields = {
            "kingdom": data.get("kingdom"),
            "class_name": data.get("class"),
            "order_name": data.get("order"),
            "family": data.get("family"),
            "genus": data.get("genus"),
            "species_epithet": data.get("species"),
        }
        return ProviderResult(
            provider=self.provider_name,
            found=True,
            raw_fields={k: v for k, v in raw_fields.items() if v},
            reference=str(data.get("usageKey")) if data.get("usageKey") else None,
        )
