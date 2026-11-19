"""CITES listing of recorded species, from app/data/cites_species.json.

Computed on read (no database column): the list is small reference data that ships
with the code, so updating it is a file change and a deploy.
"""
import json
from functools import lru_cache
from pathlib import Path

from sqlalchemy import Text, cast, func, or_

from app.models.species import Species

CITES_FILE = Path(__file__).resolve().parents[1] / "data" / "cites_species.json"

RANK_MARKERS = {"subsp.", "ssp.", "var.", "f.", "×"}
# SQL counterpart of _normalize (rank markers dropped, single spaces, lower case).
_RANK_MARKER_PATTERN = r"(^|\s)(subsp\.|ssp\.|var\.|f\.|×)(?=\s|$)"


def _normalize(name: str) -> str:
    return " ".join(t for t in name.lower().split() if t not in RANK_MARKERS)


@lru_cache(maxsize=1)
def _listed_names() -> frozenset[str]:
    with open(CITES_FILE, encoding="utf-8") as f:
        data = json.load(f)
    names = {_normalize(n) for n in data["species"]}
    names |= {_normalize(n) for n in data.get("synonyms", {})}
    return frozenset(names)


def is_cites(scientific_name: str | None) -> bool:
    """True when the species, or the species it is a subspecies/variety of, is listed.

    A species listing covers its subspecies ("Anacamptis morio longicornu"), but a
    subspecies listing does not cover the whole species ("Cervus elaphus barbarus"
    is listed, "Cervus elaphus" is not).
    """
    if not scientific_name:
        return False
    name = _normalize(scientific_name)
    listed = _listed_names()
    if name in listed:
        return True
    words = name.split()
    return len(words) > 2 and " ".join(words[:2]) in listed


def cites_condition():
    """SQL filter matching what is_cites() flags: the species' name, or the species
    its subspecies/variety belongs to, is listed."""
    name = func.lower(cast(Species.scientific_name, Text))
    name = func.regexp_replace(name, _RANK_MARKER_PATTERN, " ", "g")
    name = func.btrim(func.regexp_replace(name, r"\s+", " ", "g"))
    binomial = func.split_part(name, " ", 1) + " " + func.split_part(name, " ", 2)
    listed = sorted(_listed_names())
    return or_(name.in_(listed), binomial.in_(listed))
