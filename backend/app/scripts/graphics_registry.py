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
    required_attr: str | None = None  # rows with an empty value here are skipped
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
                # !!! adapt to the real attribute name on your Species model
                "IUCN": "iucn_status",
            },
            required_attr="iucn_status",
        ),
    )
}


def get_spec(key: str) -> GraphicSpec:
    try:
        return GRAPHIC_SPECS[key]
    except KeyError:
        raise ValueError(f"Unknown graphic type: {key}") from None
