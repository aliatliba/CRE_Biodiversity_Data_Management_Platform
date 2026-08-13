from app.integrations.base import ExternalProviderClient, HttpClientMixin, ProviderResult


class PowoClient(ExternalProviderClient, HttpClientMixin):
    def __init__(self):
        HttpClientMixin.__init__(self, "https://powo.science.kew.org/api/2")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            resp = await self.get("/search", params={"q": scientific_name})
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            if not results:
                return ProviderResult(source="powo", data={})
            return ProviderResult(source="powo", data=results[0])
        except Exception:
            return ProviderResult(source="powo", data={})
        finally:
            await self.close()
