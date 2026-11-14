"""Build app/data/protected_species_dz.json from the verified decree workbook.

    python tools/build_protected_species.py path/to/Algeria_protected_species_2012_verified.xlsx

The workbook lists every entry of Algeria's two 2012 decrees (sheets "Plants" and
"Animals") with the name as printed, the name with spelling fixed, and the current
accepted name. Each JSON entry is one taxon:

- ``scientific_name``: the current accepted name without its author, or the corrected
  name when the accepted one is unknown or uncertain ("?").
- ``names``: every name a recorded species may carry for this taxon (accepted and
  corrected names, with and without the rank marker as GBIF writes it). Printed names
  are not matched: many are garbled, and cutting them down could widen a subspecies
  to its whole species.
- ``printed_names``: the names as printed in the Journal officiel, for display.

Decree entries that resolve to the same taxon (sheet "Duplicates") become one entry.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook

OUTPUT = Path(__file__).resolve().parents[1] / "app" / "data" / "protected_species_dz.json"

DECREES = {
    "Plants": {
        "decree": "12-03",
        "source_reference": (
            "Décret exécutif n° 12-03 du 4 janvier 2012 fixant la liste des espèces "
            "végétales non cultivées protégées (JO n° 03 du 18 janvier 2012)"
        ),
    },
    "Animals": {
        "decree": "12-235",
        "source_reference": (
            "Décret exécutif n° 12-235 du 24 mai 2012 fixant la liste des espèces "
            "animales non domestiques protégées (JO n° 35 du 10 juin 2012)"
        ),
    },
}

# Group as printed (French) -> (kingdom, group shown in the app)
PLANT_GROUPS = {
    "Angiospermes": ("Plantae", "Flowering plants"),
    "Gymnospermes": ("Plantae", "Gymnosperms"),
    "Ptéridophytes": ("Plantae", "Ferns and allies"),
    "Lichens": ("Fungi", "Lichens"),
}
ANIMAL_GROUPS = {
    "Mammifères": "Mammals",
    "Oiseaux": "Birds",
    "Reptiles": "Reptiles",
    "Amphibiens": "Amphibians",
    "Arthropodes – Insectes": "Insects",
    "Arthropodes – Arachnides": "Arachnids",
    "Arthropodes – Myriapodes": "Myriapods",
}

RANKS = {"subsp.": "subsp.", "subsp": "subsp.", "ssp.": "subsp.", "ssp": "subsp.",
         "var.": "var.", "var": "var.", "f.": "f.", "forma": "f."}
GENUS = re.compile(r"^[A-Z][a-zà-ÿ]+$")
SUBGENUS = re.compile(r"^\([A-Z][a-zà-ÿ]+\)$")
EPITHET = re.compile(r"^[a-zà-ÿ]+(-[a-zà-ÿ]+)*$")
NOT_EPITHETS = {"ex", "et", "de", "van", "von", "in", "and", "sp", "s", "l"}


def canonical(name: str | None) -> str | None:
    """Scientific name without author, notes or question marks.

    "Ictonyx libycus (Hemprich & Ehrenberg, 1833)" -> "Ictonyx libycus"
    "Cyperus longus subsp. longus" -> "Cyperus longus subsp. longus"
    Returns None when no genus + epithet can be read.
    """
    if not name:
        return None
    tokens = name.replace("?", " ").replace(",", " , ").split()
    if not tokens or not GENUS.match(tokens[0]):
        return None
    parts = [tokens[0]]
    i = 1
    if i < len(tokens) and SUBGENUS.match(tokens[i]):
        i += 1  # "Atomaria (Anathilopus) theryi": the subgenus is not part of the name
    if i < len(tokens) and tokens[i] in ("×", "x"):
        parts.append("×")  # hybrid: "Cistus × reghaiensis"
        i += 1
    while i < len(tokens):
        tok = tokens[i]
        if tok in RANKS and i + 1 < len(tokens) and EPITHET.match(tokens[i + 1]):
            parts += [RANKS[tok], tokens[i + 1]]
            i += 2
        elif EPITHET.match(tok) and tok not in NOT_EPITHETS:
            parts.append(tok)
            i += 1
        else:
            break
    return " ".join(parts) if len(parts) >= 2 and parts[-1] != "×" else None


def without_rank(name: str) -> str:
    """GBIF's canonicalName drops rank and hybrid markers:
    "Poa annua subsp. exilis" -> "Poa annua exilis", "Cistus × reghaiensis" -> "Cistus reghaiensis".
    """
    return " ".join(t for t in name.split() if t not in (*RANKS.values(), "×"))


def uncertain(name: str | None) -> bool:
    return not name or "?" in name


def clean(value) -> str | None:
    text = " ".join(str(value).split()) if value is not None else ""
    return text or None


def read_sheet(workbook, sheet: str) -> list[dict]:
    rows = list(workbook[sheet].iter_rows(values_only=True))
    header = [clean(h) for h in rows[0]]
    return [dict(zip(header, row)) for row in rows[1:] if row and row[0] is not None]


def build_entries(workbook) -> list[dict]:
    entries: dict[str, dict] = {}  # lower(scientific_name) -> entry
    for sheet, meta in DECREES.items():
        for row in read_sheet(workbook, sheet):
            printed = clean(row["Latin name (as printed in JO)"])
            corrected_raw = clean(row["Name corrected (spelling & notation)"])
            accepted_raw = clean(row["Current accepted name"])
            corrected = canonical(corrected_raw) or canonical(printed)
            accepted = None if uncertain(accepted_raw) else canonical(accepted_raw)
            primary = accepted or corrected
            if not primary:
                raise ValueError(f"{sheet} No. {row['No.']}: no usable name in {row}")

            if sheet == "Plants":
                group_key = next(k for k in PLANT_GROUPS if row["Group"].startswith(k))
                kingdom, group = PLANT_GROUPS[group_key]
                family = clean(row["Current family (APG IV / WCVP)"])
                if family and family.startswith("("):
                    family = None
                # without the tatweel (ـ) used to stretch printed Arabic: it breaks search
                arabic = clean((row["Arabic name (as printed)"] or "").replace("\u0640", ""))
            else:
                kingdom, group = "Animalia", ANIMAL_GROUPS[row["Class"]]
                family, arabic = None, None

            names = [n for n in (accepted, corrected) if n]
            names += [without_rank(n) for n in names]

            entry = entries.get(primary.lower())
            if entry is None:
                entry = entries[primary.lower()] = {
                    "scientific_name": primary,
                    "kingdom": kingdom,
                    "taxon_group": group,
                    "family": family,
                    "common_name_fr": clean(row["French name (as printed)"]),
                    "common_name_ar": arabic,
                    "verification_status": clean(row["Status"]),
                    "verification_note": clean(row["Notes"]),
                    "decree": meta["decree"],
                    "source_reference": meta["source_reference"],
                    "printed_names": [],
                    "names": [],
                }
            for n in [primary, *names]:
                if n.lower() not in {x.lower() for x in entry["names"]}:
                    entry["names"].append(n)
            if printed and printed not in entry["printed_names"]:
                entry["printed_names"].append(printed)

    # A name must point to a single taxon, or matching a species would be ambiguous.
    owner: dict[str, str] = {}
    for key, entry in entries.items():
        for n in entry["names"]:
            other = owner.setdefault(n.lower(), key)
            if other != key:
                raise ValueError(f"Name {n!r} belongs to both {other!r} and {key!r}")
    return sorted(entries.values(), key=lambda e: e["scientific_name"].lower())


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__.splitlines()[2])
    workbook = load_workbook(sys.argv[1], read_only=True, data_only=True)
    entries = build_entries(workbook)
    # one taxon per line: small file, readable diffs
    lines = ",\n".join(json.dumps(e, ensure_ascii=False) for e in entries)
    OUTPUT.write_text(f"[\n{lines}\n]\n", encoding="utf-8")
    print(f"{len(entries)} taxa written to {OUTPUT}")


if __name__ == "__main__":
    main()
