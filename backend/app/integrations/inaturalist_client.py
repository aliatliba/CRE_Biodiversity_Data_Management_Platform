from app.integrations.base import ExternalProviderClient, HttpClientMixin, ProviderResult


class InaturalistClient(ExternalProviderClient, HttpClientMixin):
    def __init__(self):
        HttpClientMixin.__init__(self, "https://api.inaturalist.org/v1")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            resp = await self.get("/taxa", params={"q": scientific_name})
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            if not results:
                return ProviderResult(source="inaturalist", data={})
            taxon = results[0]
            return ProviderResult(source="inaturalist", data={
                "kingdom": taxon.get("kingdom_name"),
                "class": taxon.get("class_name"),
                "family": taxon.get("family_name"),
            })
        except Exception:
            return ProviderResult(source="inaturalist", data={})
        finally:
            await self.close()
