from app.integrations.base import ExternalProviderClient, HttpClientMixin, ProviderResult


class WikidataClient(ExternalProviderClient, HttpClientMixin):
    def __init__(self) -> None:
        HttpClientMixin.__init__(
            self,
            base_url="https://www.wikidata.org/w/api.php",
            timeout=15.0,
        )

        self.client.headers.update({
            "User-Agent": "CRE-Biodiversity-Platform/1.0 (contact@example.com)"
        })

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            # Step 1: Search for the taxon
            resp = await self.get("", params={
                "action": "wbsearchentities",
                "search": scientific_name,
                "language": "en",
                "format": "json",
                "limit": 10,
            })
            resp.raise_for_status()

            json_data = resp.json()
            results = json_data.get("search", [])

            if not results:
                return ProviderResult(source="wikidata", data={})

            # Prefer an exact scientific-name match
            normalized_name = scientific_name.strip().lower()

            result = next(
                (
                    item for item in results
                    if item.get("match", {}).get("text", "").strip().lower()
                    == normalized_name
                ),
                None,
            )

            if result is None:
                result = next(
                    (
                        item for item in results
                        if scientific_name.lower() in [
                            alias.lower() for alias in item.get("aliases", [])
                        ]
                    ),
                    results[0],
                )

            wikidata_id = result.get("id")

            if not wikidata_id:
                return ProviderResult(source="wikidata", data={})

            # Step 2: Retrieve the actual Wikidata entity
            entity_resp = await self.get("", params={
                "action": "wbgetentities",
                "ids": wikidata_id,
                "props": "claims|labels",
                "languages": "en",
                "format": "json",
            })
            entity_resp.raise_for_status()

            entity_data = entity_resp.json()
            entity = entity_data.get("entities", {}).get(wikidata_id, {})

            claims = entity.get("claims", {})

            # Scientific name (P225)
            scientific_name_value = None
            if claims.get("P225"):
                scientific_name_value = (
                    claims["P225"][0]
                    .get("mainsnak", {})
                    .get("datavalue", {})
                    .get("value")
                )

            # Taxonomic rank (P105)
            rank_id = None
            if claims.get("P105"):
                rank_id = (
                    claims["P105"][0]
                    .get("mainsnak", {})
                    .get("datavalue", {})
                    .get("value", {})
                    .get("id")
                )

            return ProviderResult(
                source="wikidata",
                data={
                    "wikidata_id": wikidata_id,
                    "scientific_name": scientific_name_value,
                    "common_name": entity.get("labels", {})
                        .get("en", {})
                        .get("value"),
                    "rank_id": rank_id,
                },
            )

        except Exception as e:
            print(f"Wikidata error: {e}")
            return ProviderResult(source="wikidata", data={})

        finally:
            await self.close()