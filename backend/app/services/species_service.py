import asyncio
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, load_only
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.core.ttl_cache import TTLCache
from app.core.utils import clean_and_dedupe_names
from app.integrations.base import ExternalProviderClient, ProviderResult, describe_error
from app.integrations.gbif_client import GbifClient
from app.integrations.inaturalist_client import InaturalistClient
from app.integrations.iucn_client import IucnClient
from app.integrations.mapper import normalize_provider_result
from app.integrations.powo_client import PowoClient
from app.integrations.wikidata_client import WikidataClient
from app.models.protected_species import ProtectedSpeciesList
from app.models.site_species import SiteSpecies
from app.models.species import Species, name_search_filter
from app.models.validation_history import SpeciesValidationHistory
from app.schemas.species import (
    SiteSpeciesCreate,
    SpeciesCreate,
    SpeciesResponse,
    SpeciesUpdate,
)

PERMITTED_EDIT_FIELDS = {
    # Taxonomy
    "kingdom",
    "class_name",
    "order_name",
    "family",
    "genus",
    "species_epithet",
    "common_name",
    # Conservation & ecological traits
    "guild",
    "ecosystem_service",
    "habitat",
    "typology",
    "endemism",
    "potential_threats",
    "reference",
    "iucn_status",
    "iucn_trend",
}


class DbRunner:
    """Run blocking SQLAlchemy work in the threadpool without blocking the event loop.

    A Session is not safe for concurrent use, so calls through one runner are
    serialised with a lock (the same session is shared by the concurrent workers of a
    batch lookup).
    """

    def __init__(self, db: Session):
        self.db = db
        self._lock = asyncio.Lock()

    async def __call__(self, fn, *args, **kwargs):
        async with self._lock:
            return await run_in_threadpool(fn, self.db, *args, **kwargs)


def _as_runner(db: "Session | DbRunner") -> DbRunner:
    return db if isinstance(db, DbRunner) else DbRunner(db)


# Provider answers keyed by "<source>:<name>" (successful answers only, never errors),
# so re-looking-up a species (batch retries, the review step, ...) does not hit the APIs again.
_provider_cache: TTLCache[ProviderResult] = TTLCache(get_settings().provider_cache_ttl_seconds)


async def _search_cached(client: ExternalProviderClient, scientific_name: str) -> ProviderResult:
    key = f"{client.source}:{scientific_name.casefold()}"
    cached = _provider_cache.get(key)
    if cached is not None:
        return cached
    result = await client.search(scientific_name)
    if result.error is None:
        _provider_cache.set(key, result)
    return result


def _skips_powo(kingdom: str | None) -> bool:
    """POWO (Kew) only covers plants: skip it when GBIF says the taxon is something else."""
    return bool(kingdom) and kingdom.strip().casefold() != "plantae"


async def fetch_provider_draft(scientific_name: str) -> dict[str, Any]:
    """Query the external providers and merge their answers into a draft.

    Pure network work: no database access (``national_status`` is added by the caller).
    Provider failures are reported in ``provider_errors`` instead of looking like "no data".
    """
    gbif = GbifClient()
    gbif_result = await _search_cached(gbif, scientific_name)
    resolved_name = gbif_result.data.get("canonicalName") or scientific_name
    is_synonym = "_resolved_from_synonym" in gbif_result.data

    other_clients: list[ExternalProviderClient] = [WikidataClient(), IucnClient()]
    if not _skips_powo(gbif_result.data.get("kingdom")):
        other_clients.append(PowoClient())
    other_clients.append(InaturalistClient())

    other_results = await asyncio.gather(
        *[_search_cached(c, resolved_name) for c in other_clients],
        return_exceptions=True,
    )

    merged: dict[str, Any] = {
        "scientific_name": resolved_name,
        "input_scientific_name": scientific_name if is_synonym else None,
        "taxonomy": {},
        "conservation": {},
        "traits": {},
        "field_sources": {},
        "provider_errors": {},
    }

    _merge_into_draft(merged, normalize_provider_result(gbif_result, "GbifClient"))
    if gbif_result.error:
        merged["provider_errors"][gbif.source] = gbif_result.error

    for client, result in zip(other_clients, other_results):
        if isinstance(result, BaseException):
            merged["provider_errors"][client.source] = describe_error(result)
            continue
        if result.error:
            merged["provider_errors"][client.source] = result.error
        _merge_into_draft(merged, normalize_provider_result(result, client.__class__.__name__))

    return merged


async def lookup_species(db: "Session | DbRunner", scientific_name: str) -> dict[str, Any]:
    run_db = _as_runner(db)
    draft = await fetch_provider_draft(scientific_name)
    # Surface protection status immediately in lookup results, so a
    # researcher sees it before saving the record, not after.
    draft["national_status"] = await run_db(compute_national_status, draft["scientific_name"])
    return draft


def _precheck_existing(db: Session, scientific_name: str, site_id: int) -> dict[str, Any] | None:
    """Existing species (as a plain dict) plus whether it is already linked to the site."""
    existing = check_duplicate(db, scientific_name)
    if existing is None:
        return None
    return {
        "existing_species": SpeciesResponse.model_validate(existing).model_dump(),
        "duplicate": is_species_associated_with_site(db, site_id, existing.id),
    }


async def _lookup_batch_item(
    run_db: DbRunner, scientific_name: str, site_id: int
) -> dict[str, Any]:
    item: dict[str, Any] = {
        "input_scientific_name": scientific_name,
        "draft": None,
        "duplicate": False,
        "existing_species": None,
        "error": None,
    }
    try:
        # First check the exact name already in the database.
        found = await run_db(_precheck_existing, scientific_name, site_id)
        if found:
            item.update(found)
            return item

        draft = await lookup_species(run_db, scientific_name)
        item["draft"] = draft

        # GBIF may resolve a synonym to another canonical name; check that too.
        found = await run_db(_precheck_existing, draft["scientific_name"], site_id)
        if found:
            item.update(found)
    except Exception as exc:
        item["error"] = str(exc)
    return item


async def lookup_species_batch(
    db: Session,
    scientific_names: list[str],
    site_id: int,
    delay_seconds: float = 1.0,
    on_progress=None,
    concurrency: int | None = None,
) -> list[dict[str, Any]]:
    """Review-only batch lookup.

    Looks up multiple scientific names without creating any Species records.
    Each item can independently be reviewed and saved later by the frontend.

    Up to ``concurrency`` species are processed at the same time (default
    ``LOOKUP_BATCH_CONCURRENCY``). Each worker waits ``delay_seconds`` after a species
    before taking the next one, which keeps the request rate towards the providers
    bounded. Results are returned in input order.

    ``on_progress(processed=, total=, item=, index=)`` is awaited after each species
    finishes (in completion order); ``index`` is the species' position in the input.
    """
    unique_names = clean_and_dedupe_names(scientific_names)
    if not unique_names:
        return []

    total = len(unique_names)
    limit = max(1, concurrency or get_settings().lookup_batch_concurrency)
    semaphore = asyncio.Semaphore(limit)
    run_db = DbRunner(db)
    results: list[dict[str, Any] | None] = [None] * total
    processed = 0

    async def worker(index: int, name: str) -> None:
        nonlocal processed
        async with semaphore:
            item = await _lookup_batch_item(run_db, name, site_id)
            results[index] = item
            processed += 1
            if on_progress is not None:
                await on_progress(processed=processed, total=total, item=item, index=index)
            # Throttle: hold the slot for a moment before starting the next species.
            if delay_seconds > 0:
                await asyncio.sleep(delay_seconds)

    await asyncio.gather(*[worker(i, n) for i, n in enumerate(unique_names)])
    return [r for r in results if r is not None]


def _merge_into_draft(merged: dict[str, Any], normalized: dict[str, Any]) -> None:
    for section in ("taxonomy", "conservation", "traits"):
        for key, value in normalized.get(section, {}).items():
            if value is not None and merged[section].get(key) is None:
                merged[section][key] = value
                merged["field_sources"][key] = normalized.get("field_sources", {}).get(key)


def check_duplicate(db: Session, scientific_name: str) -> Species | None:
    return (
        db.query(Species)
        .filter(Species.scientific_name == scientific_name)
        .first()
    )


def is_species_associated_with_site(
    db: Session,
    site_id: int,
    species_id: int,
) -> bool:
    return (
        db.query(SiteSpecies)
        .filter(
            SiteSpecies.site_id == site_id,
            SiteSpecies.species_id == species_id,
        )
        .first()
        is not None
    )


def ensure_site_association(
    db: Session, site_id: int, species_id: int, user_id: int
) -> bool:
    """Link an existing species to a site. Idempotent.

    Returns True if a new site_species row was created, False if the
    species was already associated with that site.
    """
    already = (
        db.query(SiteSpecies)
        .filter(SiteSpecies.site_id == site_id, SiteSpecies.species_id == species_id)
        .first()
    )
    if already:
        return False
    db.add(SiteSpecies(site_id=site_id, species_id=species_id, recorded_by=user_id))
    db.commit()
    return True


def compute_national_status(db: Session, scientific_name: str) -> str:
    protected = (
        db.query(ProtectedSpeciesList)
        .filter(ProtectedSpeciesList.scientific_name == scientific_name)
        .first()
    )
    return "Protected" if protected else "Non Protected"


def create_species(db: Session, data: SpeciesCreate, user_id: int) -> Species:
    existing = check_duplicate(db, data.scientific_name)
    if existing:
        raise ConflictError("Species already exists")

    national_status = compute_national_status(db, data.scientific_name)

    species = Species(
        scientific_name=data.scientific_name,
        kingdom=data.kingdom,
        class_name=data.class_name,
        order_name=data.order_name,
        family=data.family,
        genus=data.genus,
        species_epithet=data.species_epithet,
        common_name=data.common_name,
        raw_taxonomy_extra=data.raw_taxonomy_extra,
        field_sources=data.field_sources,
        iucn_status=data.iucn_status,
        iucn_trend=data.iucn_trend,
        national_status=national_status,
        guild=data.guild,
        ecosystem_service=data.ecosystem_service,
        habitat=data.habitat,
        typology=data.typology,
        endemism=data.endemism,
        potential_threats=data.potential_threats,
        reference=data.reference,
        status="validated",
        created_by=user_id,
        validated_by=user_id,
        validated_at=datetime.now(timezone.utc),
    )
    db.add(species)
    db.flush()

    history = SpeciesValidationHistory(
        species_id=species.id,
        action="created",
        changed_fields={},
        validated_by=user_id,
    )
    db.add(history)

    association = SiteSpecies(
        site_id=data.site_id,
        species_id=species.id,
        recorded_by=user_id,
    )
    db.add(association)

    db.commit()
    db.refresh(species)
    return species


def _as_utc(value: datetime) -> datetime:
    """Compare timestamps as instants. Naive values are assumed to be UTC; aware
    values keep their offset (a DB session in a non-UTC time zone returns +01:00,
    which must not be relabelled as UTC)."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def update_species(db: Session, species_id: int, data: SpeciesUpdate, user_id: int) -> Species:
    species = db.query(Species).filter(Species.id == species_id).first()
    if not species:
        raise NotFoundError("Species not found")

    incoming_updated_at = _as_utc(datetime.fromisoformat(data.updated_at.replace("Z", "+00:00")))
    if _as_utc(species.updated_at) != incoming_updated_at:
        raise ConflictError("Species was modified by another user. Please refresh and try again.")

    changes: dict[str, Any] = {}
    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("updated_at", None)

    for field, new_value in update_data.items():
        if field not in PERMITTED_EDIT_FIELDS:
            raise ForbiddenError(f"Field '{field}' is not permitted to be edited on an existing species.")
        old_value = getattr(species, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
            setattr(species, field, new_value)

    if not changes:
        raise BadRequestError("No changes detected")

    species.validated_by = user_id
    species.validated_at = datetime.now(timezone.utc)
    species.updated_at = datetime.now(timezone.utc)

    history = SpeciesValidationHistory(
        species_id=species.id,
        action="updated",
        changed_fields=changes,
        validated_by=user_id,
    )
    db.add(history)
    db.commit()
    db.refresh(species)
    return species


def get_species(db: Session, species_id: int) -> Species:
    species = db.query(Species).filter(Species.id == species_id).first()
    if not species:
        raise NotFoundError("Species not found")
    return species


CRITICAL_TAXONOMY_FIELDS = ("kingdom", "class_name", "order_name", "family", "genus")


def _apply_species_filters(
    query,
    *,
    status: str | None = None,
    search: str | None = None,
    kingdom: str | None = None,
    class_name: str | None = None,
    order_name: str | None = None,
    family: str | None = None,
    genus: str | None = None,
    national_status: str | None = None,
    site_id: int | None = None,
    iucn_status: str | None = None,
):
    if site_id is not None:
        query = query.join(SiteSpecies, SiteSpecies.species_id == Species.id).filter(
            SiteSpecies.site_id == site_id
        )
    if status:
        query = query.filter(Species.status == status)
    if search:
        query = query.filter(name_search_filter(search))
    if kingdom:
        query = query.filter(Species.kingdom.ilike(f"%{kingdom}%"))
    if class_name:
        query = query.filter(Species.class_name.ilike(f"%{class_name}%"))
    if order_name:
        query = query.filter(Species.order_name.ilike(f"%{order_name}%"))
    if family:
        query = query.filter(Species.family.ilike(f"%{family}%"))
    if genus:
        query = query.filter(Species.genus.ilike(f"%{genus}%"))
    if national_status:
        query = query.filter(Species.national_status == national_status)
    if iucn_status:
        statuses = [s.strip() for s in iucn_status.split(",") if s.strip()]
        if statuses:
            query = query.filter(Species.iucn_status.in_(statuses))
    return query


def list_species(
    db: Session,
    status: str | None = None,
    search: str | None = None,
    kingdom: str | None = None,
    class_name: str | None = None,
    order_name: str | None = None,
    family: str | None = None,
    genus: str | None = None,
    national_status: str | None = None,
    iucn_status: str | None = None,
    site_id: int | None = None,
    page: int = 1,
    page_size: int = 20,

) -> tuple[list[Species], int]:
    # Only the columns of SpeciesListItem: skips the JSONB / long-text columns.
    query = db.query(Species).options(
        load_only(
            Species.id,
            Species.scientific_name,
            Species.common_name,
            Species.family,
            Species.kingdom,
            Species.iucn_status,
            Species.national_status,
        )
    )
    query = _apply_species_filters(
        query,
        status=status,
        search=search,
        kingdom=kingdom,
        class_name=class_name,
        order_name=order_name,
        family=family,
        genus=genus,
        national_status=national_status,
        site_id=site_id,
        iucn_status=iucn_status,
    )
    total = query.count()
    items = (
        query.order_by(Species.scientific_name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def delete_species(db: Session, species_id: int) -> None:
    species = db.query(Species).filter(Species.id == species_id).first()
    if not species:
        raise NotFoundError("Species not found")
    db.query(SiteSpecies).filter(SiteSpecies.species_id == species_id).delete(
        synchronize_session=False
    )
    db.query(SpeciesValidationHistory).filter(
        SpeciesValidationHistory.species_id == species_id
    ).delete(synchronize_session=False)
    db.delete(species)
    db.commit()


def get_species_history(db: Session, species_id: int) -> list[SpeciesValidationHistory]:
    return (
        db.query(SpeciesValidationHistory)
        .filter(SpeciesValidationHistory.species_id == species_id)
        .order_by(SpeciesValidationHistory.validated_at.desc())
        .all()
    )


def associate_species_with_site(
    db: Session, site_id: int, data: SiteSpeciesCreate, user_id: int
) -> SiteSpecies:
    existing = (
        db.query(SiteSpecies)
        .filter(SiteSpecies.site_id == site_id, SiteSpecies.species_id == data.species_id)
        .first()
    )
    if existing:
        raise ConflictError("Species is already associated with this site")
    association = SiteSpecies(
        site_id=site_id,
        species_id=data.species_id,
        recorded_by=user_id,
        notes=data.notes,
    )
    db.add(association)
    db.commit()
    db.refresh(association)
    return association


def list_species_for_site(db: Session, site_id: int) -> list[SiteSpecies]:
    return db.query(SiteSpecies).filter(SiteSpecies.site_id == site_id).all()


def remove_site_species(db: Session, site_id: int, species_id: int) -> None:
    association = (
        db.query(SiteSpecies)
        .filter(SiteSpecies.site_id == site_id, SiteSpecies.species_id == species_id)
        .first()
    )
    if not association:
        raise NotFoundError("Association not found")
    db.delete(association)
    db.commit()
