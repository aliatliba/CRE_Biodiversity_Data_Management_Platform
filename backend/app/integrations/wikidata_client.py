import httpx

from app.core.config import settings
from app.integrations.base import ExternalProviderClient, ProviderResult

WIKIDATA_SEARCH_URL = "https://www.wikidata.org/w/api.php"


class WikidataClient(ExternalProviderClient):
    """Recommended authoritative source for common names (best multilingual
    coverage). See README Section 13.1.
    """

    provider_name = "wikidata"

    async def search(self, scientific_name: str) -> ProviderResult:
        params = {
            "action": "wbsearchentities",
            "search": scientific_name,
            "language": "en",
            "format": "json",
        }
        try:
            async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
                response = await client.get(WIKIDATA_SEARCH_URL, params=params)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            return ProviderResult(provider=self.provider_name, found=False, error=str(exc))

        results = data.get("search") or []
        if not results:
            return ProviderResult(provider=self.provider_name, found=False)

        top = results[0]
        raw_fields = {"common_name": top.get("label")}
        return ProviderResult(
            provider=self.provider_name,
            found=True,
            raw_fields={k: v for k, v in raw_fields.items() if v},
            reference=top.get("id"),
        )
