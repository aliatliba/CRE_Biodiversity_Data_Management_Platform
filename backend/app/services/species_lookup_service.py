import asyncio

from sqlalchemy.orm import Session

from app.integrations.base import ExternalProviderClient, ProviderResult
from app.integrations.gbif_client import GbifClient
from app.integrations.inaturalist_client import InaturalistClient
from app.integrations.iucn_client import IucnClient
from app.integrations.mapper import merge_provider_results
from app.integrations.powo_client import PowoClient
from app.integrations.wikidata_client import WikidataClient
from app.models.api_query_log import ApiQueryLog
from app.schemas.species import SpeciesDraft


class SpeciesLookupService:
    """Queries every registered external provider concurrently and merges
    the results into a single draft. Nothing is persisted here — this is
    the read-only "search" step of the workflow (README Section 11).
    """

    def __init__(self, db: Session, clients: list[ExternalProviderClient] | None = None):
        self.db = db
        self.clients: list[ExternalProviderClient] = clients or [
            GbifClient(),
            PowoClient(),
            WikidataClient(),
            IucnClient(),
            InaturalistClient(),
        ]

    async def lookup(self, scientific_name: str, requested_by: int) -> SpeciesDraft:
        results: list[ProviderResult] = await asyncio.gather(
            *(client.search(scientific_name) for client in self.clients)
        )

        # Each provider call is logged independently so one provider's failure
        # doesn't prevent the others' results from being recorded.
        for result in results:
            self.db.add(
                ApiQueryLog(
                    provider=result.provider,
                    query_term=scientific_name,
                    status="success" if result.found else ("error" if result.error else "not_found"),
                    response_snapshot=result.raw_fields or None,
                    requested_by=requested_by,
                )
            )
        self.db.flush()

        return merge_provider_results(scientific_name, results)
