import logging

from app.integrations.base import (
    ExternalProviderClient,
    HttpClientMixin,
    ProviderResult,
    describe_error,
)

logger = logging.getLogger(__name__)


class InaturalistClient(ExternalProviderClient, HttpClientMixin):
    """Common (vernacular) name from iNaturalist.

    ``/taxa`` results carry no kingdom/class/family fields (only ancestor ids), and the
    first hit for "Panthera leo" is the genus Panthera, so only an exact,
    species-level name match is used, and only for its common name.
    """

    source = "inaturalist"

    def __init__(self):
        HttpClientMixin.__init__(self, "https://api.inaturalist.org/v1")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            resp = await self.get(
                "/taxa",
                params={
                    "q": scientific_name,
                    "rank": "species,subspecies,variety",
                    "per_page": 10,
                },
            )
            resp.raise_for_status()
            wanted = scientific_name.strip().casefold()
            taxon = next(
                (
                    t
                    for t in resp.json().get("results", [])
                    if (t.get("name") or "").casefold() == wanted
                ),
                None,
            )
            if taxon is None:
                return ProviderResult(source=self.source, data={})
            return ProviderResult(
                source=self.source,
                data={
                    "common_name": taxon.get("preferred_common_name"),
                    "taxon_id": taxon.get("id"),
                },
            )
        except Exception as exc:
            logger.warning(
                "iNaturalist lookup failed for %s: %s", scientific_name, describe_error(exc)
            )
            return ProviderResult(source=self.source, data={}, error=describe_error(exc))
