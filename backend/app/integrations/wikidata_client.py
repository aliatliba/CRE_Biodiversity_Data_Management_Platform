import logging

from app.integrations.base import (
    ExternalProviderClient,
    HttpClientMixin,
    ProviderResult,
    describe_error,
)

logger = logging.getLogger(__name__)


class WikidataClient(ExternalProviderClient, HttpClientMixin):
    source = "wikidata"

    def __init__(self):
        HttpClientMixin.__init__(self, "https://www.wikidata.org/w/api.php")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            resp = await self.get(
                "",
                params={
                    "action": "wbsearchentities",
                    "search": scientific_name,
                    "language": "en",
                    "format": "json",
                    "limit": 1,
                },
            )
            resp.raise_for_status()
            results = resp.json().get("search", [])
            if not results:
                return ProviderResult(source=self.source, data={})
            return ProviderResult(
                source=self.source,
                data={"common_name": results[0].get("label"), "kingdom": None},
            )
        except Exception as exc:
            logger.warning(
                "Wikidata lookup failed for %s: %s", scientific_name, describe_error(exc)
            )
            return ProviderResult(source=self.source, data={}, error=describe_error(exc))
