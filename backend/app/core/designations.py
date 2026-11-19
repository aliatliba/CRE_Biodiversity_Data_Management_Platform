"""Catalog of international and national designations a site can carry.

Single source of truth: the API validates designation ids against it and returns the
catalog to the frontend (GET /designations), which shows the logos from
frontend/public/assets/designations/. To add a designation, drop its square SVG in that
folder and add one entry below; no migration is needed (ids are plain strings).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

ICON_BASE = "/assets/designations"


@dataclass(frozen=True)
class Designation:
    id: str
    name_en: str
    name_fr: str
    short_name: str
    icon: str
    official_url: str | None
    sort_order: int

    def as_dict(self) -> dict:
        return asdict(self)


CATALOG: tuple[Designation, ...] = (
    Designation(
        id="ramsar",
        name_en="Ramsar Site (Wetland of International Importance)",
        name_fr="Site Ramsar (zone humide d'importance internationale)",
        short_name="Ramsar",
        icon=f"{ICON_BASE}/ramsar.svg",
        official_url="https://www.ramsar.org/",
        sort_order=10,
    ),
    Designation(
        id="unesco-mab",
        name_en="UNESCO Man and the Biosphere (MAB) Reserve",
        name_fr="Réserve de biosphère UNESCO (MAB)",
        short_name="UNESCO MAB",
        icon=f"{ICON_BASE}/unesco.svg",
        official_url="https://www.unesco.org/en/mab",
        sort_order=20,
    ),
    Designation(
        id="iba",
        name_en="BirdLife Important Bird Area (IBA)",
        name_fr="Zone importante pour la conservation des oiseaux (ZICO / IBA)",
        short_name="IBA",
        icon=f"{ICON_BASE}/iba.svg",
        official_url="https://datazone.birdlife.org/",
        sort_order=30,
    ),
    Designation(
        id="kba",
        name_en="Key Biodiversity Area (KBA)",
        name_fr="Zone clé pour la biodiversité (KBA)",
        short_name="KBA",
        icon=f"{ICON_BASE}/kba.svg",
        official_url="https://www.keybiodiversityareas.org/",
        sort_order=40,
    ),
    Designation(
        id="parc-national-el-kala",
        name_en="El Kala National Park",
        name_fr="Parc National d'El Kala",
        short_name="PN El Kala",
        icon=f"{ICON_BASE}/parc-national-el-kala.svg",
        official_url=None,
        sort_order=50,
    ),
)

BY_ID: dict[str, Designation] = {d.id: d for d in CATALOG}


def sort_key(designation_id: str) -> tuple[int, str]:
    designation = BY_ID.get(designation_id)
    return (designation.sort_order if designation else 10_000, designation_id)


def resolve(designation_ids) -> list[dict]:
    """Catalog entries for the given ids, in catalog order. Ids no longer in the
    catalog are skipped (a removed entry must not break site pages)."""
    return [BY_ID[i].as_dict() for i in sorted(set(designation_ids), key=sort_key) if i in BY_ID]
