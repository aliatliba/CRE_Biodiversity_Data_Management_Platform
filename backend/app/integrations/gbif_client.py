from app.integrations.base import ExternalProviderClient, HttpClientMixin, ProviderResult


class GbifClient(ExternalProviderClient, HttpClientMixin):
    def __init__(self):
        HttpClientMixin.__init__(self, "https://api.gbif.org/v1")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            resp = await self.get("/species/match", params={"name": scientific_name})
            resp.raise_for_status()
            match = resp.json()

            # A match can resolve to a SYNONYM usage. In that case the match
            # response's genus/species/canonicalName fields still describe
            # the OLD name — acceptedUsageKey is the only pointer to the
            # currently-accepted record, which needs its own lookup.
            is_synonym = match.get("synonym") or match.get("status") == "SYNONYM"
            accepted_key = match.get("acceptedUsageKey")

            if is_synonym and accepted_key:
                accepted_resp = await self.get(f"/species/{accepted_key}")
                accepted_resp.raise_for_status()
                accepted = accepted_resp.json()
                accepted["_resolved_from_synonym"] = match.get("canonicalName") or scientific_name
                return ProviderResult(source="gbif", data=accepted)

            return ProviderResult(source="gbif", data=match)
        except Exception:
            return ProviderResult(source="gbif", data={})
        finally:
            await self.close()