import json
from collections.abc import Iterable
from pathlib import Path

from sqlalchemy import case, exists, func, or_
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import set_committed_value

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.models.protected_species import ProtectedSpeciesList, ProtectedSpeciesName
from app.models.species import Species, escape_like
from app.schemas.protected_species import ProtectedSpeciesCreate

# Algeria's 2012 decrees, verified name by name (built by tools/build_protected_species.py)
DECREE_SEED_FILE = Path(__file__).resolve().parents[1] / "data" / "protected_species_dz.json"

PROTECTED = "Protected"
NOT_PROTECTED = "Non Protected"

# Fields copied from the seed file onto each decree entry.
_DECREE_FIELDS = (
    "scientific_name",
    "source_reference",
    "decree",
    "kingdom",
    "taxon_group",
    "family",
    "common_name_fr",
    "common_name_ar",
    "verification_status",
    "verification_note",
)


def _is_listed():
    """SQL condition: Species.scientific_name is a matching name of a protected entry.
    Both columns are CITEXT, so the comparison is case-insensitive."""
    return exists().where(
        ProtectedSpeciesName.kind == "match",
        ProtectedSpeciesName.name == Species.scientific_name,
    )


def is_protected_name(db: Session, names: Iterable[str | None]) -> bool:
    names = [n for n in names if n]
    if not names:
        return False
    return (
        db.query(ProtectedSpeciesName.id)
        .filter(ProtectedSpeciesName.kind == "match", ProtectedSpeciesName.name.in_(names))
        .first()
        is not None
    )


def recompute_national_status(db: Session, names: Iterable[str] | None = None) -> int:
    """Set ``Species.national_status`` from the protected list, for the species named in
    ``names`` (any case), or for every species when ``names`` is None.

    Does not commit: callers run it in the same transaction as the list change.
    Returns the number of species rows updated.
    """
    new_status = case((_is_listed(), PROTECTED), else_=NOT_PROTECTED)
    query = db.query(Species).filter(Species.national_status != new_status)
    if names is not None:
        names = list(names)
        if not names:
            return 0
        query = query.filter(Species.scientific_name.in_(names))
    return query.update({Species.national_status: new_status}, synchronize_session=False)


def list_taxon_groups(db: Session) -> list[dict]:
    rows = (
        db.query(ProtectedSpeciesList.taxon_group, func.count(ProtectedSpeciesList.id))
        .filter(ProtectedSpeciesList.taxon_group.isnot(None))
        .group_by(ProtectedSpeciesList.taxon_group)
        .order_by(func.count(ProtectedSpeciesList.id).desc())
        .all()
    )
    return [{"taxon_group": group, "count": count} for group, count in rows]


def list_protected_species(
    db: Session,
    search: str | None = None,
    taxon_group: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[dict], int]:
    """One page of the protected list (alphabetical). Search covers every name of an
    entry (accepted, synonyms, as printed in the decree), its family and common names.
    Each entry comes with the recorded species carrying one of its names, if any."""
    query = db.query(ProtectedSpeciesList)
    if taxon_group:
        query = query.filter(ProtectedSpeciesList.taxon_group == taxon_group)
    if search:
        pattern = f"%{escape_like(search)}%"
        query = query.filter(
            or_(
                ProtectedSpeciesList.scientific_name.ilike(pattern, escape="\\"),
                ProtectedSpeciesList.family.ilike(pattern, escape="\\"),
                ProtectedSpeciesList.common_name_fr.ilike(pattern, escape="\\"),
                ProtectedSpeciesList.common_name_ar.ilike(pattern, escape="\\"),
                exists().where(
                    ProtectedSpeciesName.protected_species_id == ProtectedSpeciesList.id,
                    ProtectedSpeciesName.name.ilike(pattern, escape="\\"),
                ),
            )
        )
    total = query.count()
    entries = (
        query.order_by(ProtectedSpeciesList.scientific_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    ids = [e.id for e in entries]

    names: dict[int, list[ProtectedSpeciesName]] = {i: [] for i in ids}
    recorded: dict[int, tuple[int, str | None]] = {}
    if ids:
        for n in (
            db.query(ProtectedSpeciesName)
            .filter(ProtectedSpeciesName.protected_species_id.in_(ids))
            .order_by(ProtectedSpeciesName.id)
        ):
            names[n.protected_species_id].append(n)
        # A taxon may be recorded under its accepted name or a synonym: prefer the
        # first matching name (the accepted one).
        for entry_id, species_id, iucn_status in (
            db.query(ProtectedSpeciesName.protected_species_id, Species.id, Species.iucn_status)
            .join(Species, Species.scientific_name == ProtectedSpeciesName.name)
            .filter(
                ProtectedSpeciesName.protected_species_id.in_(ids),
                ProtectedSpeciesName.kind == "match",
            )
            .order_by(ProtectedSpeciesName.id)
        ):
            recorded.setdefault(entry_id, (species_id, iucn_status))

    items = []
    for entry in entries:
        own = entry.scientific_name.lower()
        species_id, iucn_status = recorded.get(entry.id, (None, None))
        items.append(
            {
                "id": entry.id,
                "scientific_name": entry.scientific_name,
                "source_reference": entry.source_reference,
                "decree": entry.decree,
                "kingdom": entry.kingdom,
                "taxon_group": entry.taxon_group,
                "family": entry.family,
                "common_name_fr": entry.common_name_fr,
                "common_name_ar": entry.common_name_ar,
                "verification_status": entry.verification_status,
                "verification_note": entry.verification_note,
                "printed_names": [
                    n.name for n in names[entry.id] if n.kind == "printed" and n.name.lower() != own
                ],
                "synonyms": _synonyms(entry.scientific_name, names[entry.id]),
                "added_by": entry.added_by,
                "created_at": entry.created_at,
                "recorded_species_id": species_id,
                "iucn_status": iucn_status or None,
            }
        )
    return items, total


def _synonyms(scientific_name: str, names: list[ProtectedSpeciesName]) -> list[str]:
    """Other matching names, leaving out mere notation variants of the entry's own name
    ("Poa annua exilis" for "Poa annua subsp. exilis")."""
    def bare(name: str) -> str:
        return " ".join(t for t in name.lower().split() if t not in ("subsp.", "var.", "f.", "×"))

    own = bare(scientific_name)
    seen: set[str] = set()
    out = []
    for n in names:
        key = bare(n.name)
        if n.kind == "match" and key != own and key not in seen:
            seen.add(key)
            out.append(n.name)
    return out


def add_protected_species(
    db: Session, data: ProtectedSpeciesCreate, user_id: int
) -> ProtectedSpeciesList:
    clash = (
        db.query(ProtectedSpeciesList.scientific_name)
        .join(ProtectedSpeciesName, ProtectedSpeciesName.protected_species_id == ProtectedSpeciesList.id)
        .filter(
            ProtectedSpeciesName.kind == "match",
            ProtectedSpeciesName.name == data.scientific_name,
        )
        .first()
    )
    if clash:
        listed = clash[0]
        if listed.lower() == data.scientific_name.lower():
            raise ConflictError("This species is already on the protected list")
        raise ConflictError(f"This name is already on the protected list, as {listed}")
    entry = ProtectedSpeciesList(
        scientific_name=data.scientific_name,
        source_reference=data.source_reference,
        common_name_fr=data.common_name_fr,
        taxon_group=data.taxon_group,
        added_by=user_id,
    )
    entry.names.append(ProtectedSpeciesName(name=data.scientific_name, kind="match"))
    db.add(entry)
    db.flush()
    recompute_national_status(db, [entry.scientific_name])
    db.commit()
    db.refresh(entry)
    return entry


def remove_protected_species(db: Session, entry_id: int) -> None:
    entry = db.query(ProtectedSpeciesList).filter(ProtectedSpeciesList.id == entry_id).first()
    if not entry:
        raise NotFoundError("Entry not found")
    if entry.decree:
        raise BadRequestError(
            f"This species is protected by decree n° {entry.decree} and cannot be removed."
        )
    names = [n.name for n in entry.names if n.kind == "match"]
    db.delete(entry)
    db.flush()
    recompute_national_status(db, names)
    db.commit()


def sync_decree_list(db: Session, admin_user_id: int | None) -> bool:
    """Make the decree entries match DECREE_SEED_FILE: insert new taxa, update changed
    ones, delete those no longer in the file. Entries added by administrators are kept,
    unless the decree list now covers one of their names.

    Runs at every startup; does nothing when the database is already up to date.
    Returns True when something changed (national statuses are then recomputed).
    """
    if not DECREE_SEED_FILE.exists():
        return False
    with open(DECREE_SEED_FILE, encoding="utf-8") as f:
        seed = json.load(f)

    def wanted_names(item: dict) -> list[tuple[str, str]]:
        names = [(n, "match") for n in item["names"]]
        return names + [(n, "printed") for n in item.get("printed_names", [])]

    # Few round trips: the database may be remote, and this runs at every startup.
    existing = {
        e.scientific_name.lower(): e
        for e in db.query(ProtectedSpeciesList)
        .options(selectinload(ProtectedSpeciesList.names))
        .filter(ProtectedSpeciesList.decree.isnot(None))
    }
    seed_by_key = {item["scientific_name"].lower(): item for item in seed}
    seed_match_names = {n.lower() for item in seed for n in item["names"]}

    # Decree entries no longer in the file, and administrator entries now covered by
    # the decree list (they would clash on a name). Their names go with them (FK cascade).
    stale_ids = [e.id for key, e in existing.items() if key not in seed_by_key]
    stale_ids += [
        entry_id
        for (entry_id,) in db.query(ProtectedSpeciesList.id).filter(
            ProtectedSpeciesList.decree.is_(None),
            exists().where(
                ProtectedSpeciesName.protected_species_id == ProtectedSpeciesList.id,
                ProtectedSpeciesName.kind == "match",
                func.lower(ProtectedSpeciesName.name).in_(seed_match_names),
            ),
        )
    ]
    changed = bool(stale_ids)

    renamed: list[tuple[ProtectedSpeciesList, list[tuple[str, str]]]] = []
    new_items: list[dict] = []
    for key, item in seed_by_key.items():
        entry = existing.get(key)
        if entry is None:
            new_items.append(item)
            continue
        for field in _DECREE_FIELDS:
            if getattr(entry, field) != item.get(field):
                setattr(entry, field, item.get(field))
                changed = True
        wanted = wanted_names(item)
        if [(n.name, n.kind) for n in entry.names] != wanted:
            renamed.append((entry, wanted))

    # Old names are deleted before any new one is inserted: a name may move between
    # entries, and the unique index is checked row by row.
    if stale_ids:
        db.query(ProtectedSpeciesList).filter(ProtectedSpeciesList.id.in_(stale_ids)).delete(
            synchronize_session=False
        )
    if renamed:
        db.query(ProtectedSpeciesName).filter(
            ProtectedSpeciesName.protected_species_id.in_([e.id for e, _ in renamed])
        ).delete(synchronize_session=False)
        for entry, wanted in renamed:
            set_committed_value(entry, "names", [])
            entry.names.extend(ProtectedSpeciesName(name=n, kind=k) for n, k in wanted)
        changed = True

    for item in new_items:
        entry = ProtectedSpeciesList(added_by=admin_user_id)
        for field in _DECREE_FIELDS:
            setattr(entry, field, item.get(field))
        entry.names = [ProtectedSpeciesName(name=n, kind=k) for n, k in wanted_names(item)]
        db.add(entry)
        changed = True

    if changed:
        db.flush()
        recompute_national_status(db)
        db.commit()
    else:
        db.rollback()
    return changed

