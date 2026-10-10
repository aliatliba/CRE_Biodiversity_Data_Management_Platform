import logging

from app.integrations.base import (
    ExternalProviderClient,
    HttpClientMixin,
    ProviderResult,
    describe_error,
)

logger = logging.getLogger(__name__)


class InaturalistClient(ExternalProviderClient, HttpClientMixin):
    source = "inaturalist"

    def __init__(self):
        HttpClientMixin.__init__(self, "https://api.inaturalist.org/v1")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            resp = await self.get("/taxa", params={"q": scientific_name})
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            if not results:
                return ProviderResult(source=self.source, data={})
            taxon = results[0]
            return ProviderResult(
                source=self.source,
                data={
                    "kingdom": taxon.get("kingdom_name"),
                    "class": taxon.get("class_name"),
                    "family": taxon.get("family_name"),
                },
            )
        except Exception as exc:
            logger.warning(
                "iNaturalist lookup failed for %s: %s", scientific_name, describe_error(exc)
            )
            return ProviderResult(source=self.source, data={}, error=describe_error(exc))
