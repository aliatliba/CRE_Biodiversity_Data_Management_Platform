import httpx

from app.core.config import settings
from app.integrations.base import ExternalProviderClient, ProviderResult

# The IUCN Red List API (v4) requires a registered API token. See README
# Section 18, open question 3, for who owns registering/renewing this token.
IUCN_ASSESSMENT_URL = "https://api.iucnredlist.org/api/v4/taxa/scientific_name"


class IucnClient(ExternalProviderClient):
    """Recommended authoritative source for conservation status/trend.
    See README Section 13.1.
    """

    provider_name = "iucn"

    async def search(self, scientific_name: str) -> ProviderResult:
        if not settings.iucn_api_token:
            return ProviderResult(
                provider=self.provider_name, found=False, error="IUCN_API_TOKEN not configured"
            )

        headers = {"Authorization": settings.iucn_api_token}
        try:
            async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
                response = await client.get(
                    IUCN_ASSESSMENT_URL, params={"genus_name": "", "species_name": scientific_name}, headers=headers
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            return ProviderResult(provider=self.provider_name, found=False, error=str(exc))

        assessments = data.get("assessments") or []
        if not assessments:
            return ProviderResult(provider=self.provider_name, found=False)

        latest = assessments[0]
        raw_fields = {
            "iucn_status": latest.get("red_list_category", {}).get("code"),
            "iucn_trend": latest.get("population_trend", {}).get("description", {}).get("en"),
        }
        return ProviderResult(
            provider=self.provider_name,
            found=True,
            raw_fields={k: v for k, v in raw_fields.items() if v},
            reference=str(latest.get("assessment_id")) if latest.get("assessment_id") else None,
        )
