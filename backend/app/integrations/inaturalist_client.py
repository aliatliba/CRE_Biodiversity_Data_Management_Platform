import httpx

from app.core.config import settings
from app.integrations.base import ExternalProviderClient, ProviderResult

INATURALIST_SEARCH_URL = "https://api.inaturalist.org/v1/taxa"


class InaturalistClient(ExternalProviderClient):
    """Best suited for autocomplete-as-you-type suggestions; not used as an
    authority for formal status fields. See README Section 13.1.
    """

    provider_name = "inaturalist"

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
                response = await client.get(INATURALIST_SEARCH_URL, params={"q": scientific_name, "per_page": 1})
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            return ProviderResult(provider=self.provider_name, found=False, error=str(exc))

        results = data.get("results") or []
        if not results:
            return ProviderResult(provider=self.provider_name, found=False)

        top = results[0]
        raw_fields = {"common_name": (top.get("preferred_common_name"))}
        return ProviderResult(
            provider=self.provider_name,
            found=True,
            raw_fields={k: v for k, v in raw_fields.items() if v},
            reference=str(top.get("id")) if top.get("id") else None,
        )

    async def autocomplete(self, partial_name: str, limit: int = 10) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
                response = await client.get(
                    INATURALIST_SEARCH_URL, params={"q": partial_name, "per_page": limit}
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            return []

        return [r["name"] for r in (data.get("results") or []) if r.get("name")]
