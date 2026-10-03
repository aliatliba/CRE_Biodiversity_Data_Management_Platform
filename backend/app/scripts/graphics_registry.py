"""
Registry of available graphics.

To add a new graphic:
  1. Drop the R script in app/scripts/  (contract: Rscript <script> <input_excel> <output_dir>)
  2. Add one GraphicSpec entry to GRAPHIC_SPECS below.
Nothing else (API, job store, frontend) needs to change.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"


@dataclass(frozen=True)
class GraphicSpec:
    key: str                          # public id used by the API / frontend
    label: str                        # shown in the UI
    description: str                  # shown in the UI
    script: Path                      # R script
    output_basename: str              # R must write <basename>.<format>
    columns: dict[str, str]           # Excel header -> Species model attribute
    formats: tuple[str, ...] = ("png", "tiff", "pdf")
    only_validated: bool = True
    required_attrs: tuple[str, ...] = ()  # rows missing any of these are skipped
    timeout: int = 900


GRAPHIC_SPECS: dict[str, GraphicSpec] = {
    spec.key: spec
    for spec in (
        GraphicSpec(
            key="dendrogram",
            label="Taxonomic dendrogram",
            description=(
                "Circular hierarchy from kingdom to class, order, family, "
                "genus and terminal species."
            ),
            script=SCRIPTS_DIR / "dendrogramme_taxonomique.R",
            output_basename="dendrogramme_circulaire",
            columns={
                "Kingdom": "kingdom",
                "Class": "class_name",
                "Order": "order_name",
                "Family": "family",
                "Genus": "genus",
                "Scientific name": "scientific_name",
            },
        ),
        GraphicSpec(
            key="iucn",
            label="IUCN conservation status",
            description=(
                "Number of species per IUCN Red List category "
                "(LC, NT, VU, EN, CR)."
            ),
            script=SCRIPTS_DIR / "iucn_conservation.R",
            output_basename="graphique_uicn",
            columns={
                "Scientific name": "scientific_name",
                "IUCN": "iucn_status",
            },
            required_attrs=("iucn_status",),
        ),
        GraphicSpec(
            key="family_richness",
            label="Species richness by family",
            description=(
                "Bar chart of the number of species per family, with "
                "PhyloPic silhouettes (needs internet access on the server)."
            ),
            script=SCRIPTS_DIR / "richesse_familles.R",
            output_basename="richesse_familles",
            columns={
                "Order": "order_name",
                "Family": "family",
                "Genus": "genus",
                "Scientific name": "scientific_name",
            },
            formats=("png", "pdf"),
            required_attrs=("family",),
        ),
        GraphicSpec(
            key="conservation_network",
            label="Trend, protection and IUCN diagram",
            description=(
                "Circular diagram linking population trend, national "
                "protection status and IUCN category."
            ),
            script=SCRIPTS_DIR / "statuts_conservation.R",
            output_basename="diagramme_circulaire_statuts",
            columns={
                "Scientific name": "scientific_name",
                "Trend": "iucn_trend",
                "National status": "national_status",
                "IUCN": "iucn_status",
            },
            required_attrs=("iucn_trend", "national_status", "iucn_status"),
        ),
    )
}


def get_spec(key: str) -> GraphicSpec:
    try:
        return GRAPHIC_SPECS[key]
    except KeyError:
        raise ValueError(f"Unknown graphic type: {key}") from None