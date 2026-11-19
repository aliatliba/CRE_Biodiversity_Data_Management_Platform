import json

from app.services.cites_service import CITES_FILE, is_cites


def test_listed_species_and_synonyms():
    assert is_cites("Tyto alba")
    assert is_cites("tyto ALBA")  # case-insensitive
    assert is_cites("Aquila fasciata")  # synonym of Hieraaetus fasciatus
    assert not is_cites("Passer domesticus")
    assert not is_cites(None)


def test_subspecies_rules():
    # A species listing covers its subspecies and varieties...
    assert is_cites("Anacamptis morio longicornu")
    assert is_cites("Anacamptis morio subsp. longicornu")
    # ...but a subspecies listing does not cover the whole species.
    assert is_cites("Cervus elaphus barbarus")
    assert not is_cites("Cervus elaphus")


def test_data_file_is_consistent():
    data = json.loads(CITES_FILE.read_text(encoding="utf-8"))
    species = data["species"]
    assert len(species) == len(set(species))
    assert set(data["synonyms"].values()) <= set(species)
