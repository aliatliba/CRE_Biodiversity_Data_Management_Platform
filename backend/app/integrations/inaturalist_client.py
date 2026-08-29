from app.integrations.base import ExternalProviderClient, HttpClientMixin, ProviderResult


class InaturalistClient(ExternalProviderClient, HttpClientMixin):
    def __init__(self):
        HttpClientMixin.__init__(self, "https://api.inaturalist.org/v1")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            resp = await self.get(
                "/taxa",
                params={"q": scientific_name, "rank": "species"}
            )
            resp.raise_for_status()

            data = resp.json()
            results = data.get("results", [])

            if not results:
                return ProviderResult(source="inaturalist", data={})

            normalized_name = scientific_name.strip().lower()

            taxon = next(
                (
                    item for item in results
                    if item.get("name", "").strip().lower() == normalized_name
                ),
                results[0],
            )

            return ProviderResult(
                source="inaturalist",
                data={
                    "name": taxon.get("name"),
                    "rank": taxon.get("rank"),
                    "common_name": taxon.get("preferred_common_name"),
                    "class": taxon.get("iconic_taxon_name"),
                },
            )

        except Exception:
            return ProviderResult(source="inaturalist", data={})

        finally:
            await self.close()