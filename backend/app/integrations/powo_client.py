import httpx

from app.core.config import settings
from app.integrations.base import ExternalProviderClient, ProviderResult

POWO_SEARCH_URL = "http://www.plantsoftheworldonline.org/api/2/search"


class PowoClient(ExternalProviderClient):
    """Recommended authoritative source for plant taxonomy specifically —
    should override GBIF when the record is a plant. See README Section 13.1.
    """

    provider_name = "powo"

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
                response = await client.get(POWO_SEARCH_URL, params={"q": scientific_name})
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            return ProviderResult(provider=self.provider_name, found=False, error=str(exc))

        results = data.get("results") or []
        if not results:
            return ProviderResult(provider=self.provider_name, found=False)

        top = results[0]
        raw_fields = {
            "family": top.get("family"),
            "genus": top.get("genus"),
            "species_epithet": top.get("species"),
        }
        return ProviderResult(
            provider=self.provider_name,
            found=True,
            raw_fields={k: v for k, v in raw_fields.items() if v},
            reference=top.get("fqId"),
        )
