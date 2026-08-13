from app.integrations.base import ExternalProviderClient, HttpClientMixin, ProviderResult


class WikidataClient(ExternalProviderClient, HttpClientMixin):
    def __init__(self):
        HttpClientMixin.__init__(self, "https://www.wikidata.org/w/api.php")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            resp = await self.get("", params={
                "action": "wbsearchentities",
                "search": scientific_name,
                "language": "en",
                "format": "json",
                "limit": 1,
            })
            resp.raise_for_status()
            json_data = resp.json()
            results = json_data.get("search", [])
            if not results:
                return ProviderResult(source="wikidata", data={})
            return ProviderResult(source="wikidata", data={
                "common_name": results[0].get("label"),
                "kingdom": None,
            })
        except Exception:
            return ProviderResult(source="wikidata", data={})
        finally:
            await self.close()
