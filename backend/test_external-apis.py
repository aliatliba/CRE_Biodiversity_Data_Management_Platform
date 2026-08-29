import asyncio

from app.integrations.gbif_client import GbifClient
from app.integrations.iucn_client import IucnClient
from app.integrations.inaturalist_client import InaturalistClient
from app.integrations.powo_client import PowoClient
from app.integrations.wikidata_client import WikidataClient


async def test_gbif():
    print("\n===== GBIF =====")

    client = GbifClient()
    result = await client.search("Panthera leo")

    print("Source:", result.source)
    print("Data:", result.data)


async def test_iucn():
    print("\n===== IUCN =====")

    client = IucnClient()
    result = await client.search("Panthera leo")

    print("Source:", result.source)
    print("Data:", result.data)


async def test_inaturalist():
    print("\n===== iNaturalist =====")

    client = InaturalistClient()
    result = await client.search("Panthera leo")

    print("Source:", result.source)
    print("Data:", result.data)


async def test_powo():
    print("\n===== POWO =====")

    client = PowoClient()
    result = await client.search("Panthera leo")

    print("Source:", result.source)
    print("Data:", result.data)


async def test_wikidata():
    print("\n===== Wikidata =====")

    client = WikidataClient()
    result = await client.search("Panthera leo")

    print("Source:", result.source)
    print("Data:", result.data)


async def main():
    await test_gbif()
    await test_iucn()
    await test_inaturalist()
    await test_powo()
    await test_wikidata()


if __name__ == "__main__":
    asyncio.run(main())