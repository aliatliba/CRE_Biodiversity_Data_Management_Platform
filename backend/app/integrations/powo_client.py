import logging

from app.integrations.base import (
    ExternalProviderClient,
    HttpClientMixin,
    ProviderResult,
    describe_error,
)

logger = logging.getLogger(__name__)


class PowoClient(ExternalProviderClient, HttpClientMixin):
    source = "powo"

    def __init__(self):
        HttpClientMixin.__init__(self, "https://powo.science.kew.org/api/2")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            resp = await self.get("/search", params={"q": scientific_name})
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            if not results:
                return ProviderResult(source=self.source, data={})
            return ProviderResult(source=self.source, data=results[0])
        except Exception as exc:
            logger.warning("POWO lookup failed for %s: %s", scientific_name, describe_error(exc))
            return ProviderResult(source=self.source, data={}, error=describe_error(exc))
