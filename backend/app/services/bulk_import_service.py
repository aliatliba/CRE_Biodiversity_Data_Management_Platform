"""Bulk species import.

Takes a list of scientific names, runs each through the existing
external-provider lookup (`species_service.lookup_species`, which already
hits GBIF, IUCN, POWO, Wikidata and iNaturalist), and creates a validated
`Species` row for each new one via `species_service.create_species`.

This is shared by:
  - the `/species/bulk-import` API endpoint (app/api/species.py)
  - the standalone CLI (app/scripts/bulk_import_species.py)

so behavior (dedup rules, rate limiting, error handling) can't drift
between the two entry points.

Rate limiting: a configurable delay is awaited *between* species (not
between individual provider calls within one species — those four calls
already fan out concurrently in `lookup_species` and hit four different
APIs, so throttling them against each other buys nothing). Spacing out
species is what keeps any single provider, like GBIF or POWO, from seeing
a burst of 300 requests in a few seconds.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, public_error_message
from app.core.utils import clean_and_dedupe_names
from app.models.site_species import SiteSpecies
from app.schemas.species import SpeciesCreate
from app.services import site_service, species_service

DEFAULT_DELAY_SECONDS = 1.5
MAX_BATCH_SIZE = 300

ProgressCallback = Callable[["ImportSummary"], Awaitable[None]]


@dataclass
class ImportItemResult:
    input_name: str
    resolved_name: str | None = None
    # pending | created | linked_existing | would_link_existing | looked_up |
    # skipped_duplicate (already at this site) | skipped_duplicate_in_batch |
    # invalid | failed
    status: str = "pending"
    species_id: int | None = None
    error: str | None = None


@dataclass
class ImportSummary:
    total: int
    created: int = 0
    linked: int = 0
    skipped: int = 0
    failed: int = 0
    invalid: int = 0
    items: list[ImportItemResult] = field(default_factory=list)


# Which IUCN assessment becomes the species' status when nobody picks one by hand
# (the review screen lets the user choose; a bulk import cannot).
IUCN_SCOPE_PREFERENCE = ("Global", "Mediterranean", "Europe")


def _pick_iucn_assessment(assessments: list[dict[str, Any]]) -> dict[str, Any] | None:
    by_scope = {a.get("scope"): a for a in assessments if a.get("category")}
    return next((by_scope[s] for s in IUCN_SCOPE_PREFERENCE if s in by_scope), None)


def _has_species_match(draft: dict[str, Any]) -> bool:
    """GBIF found the name at species level (genus/family-only matches are dropped)."""
    taxonomy = draft.get("taxonomy", {})
    return bool(taxonomy.get("genus") or taxonomy.get("family") or taxonomy.get("kingdom"))


def _draft_to_species_create(draft: dict[str, Any], site_id: int) -> SpeciesCreate:
    taxonomy = draft.get("taxonomy", {})
    conservation = draft.get("conservation", {})
    field_sources = dict(draft.get("field_sources") or {})

    assessment = _pick_iucn_assessment(conservation.get("iucn_assessments") or [])
    if assessment is not None:
        # Same provenance record the review screen stores for a chosen assessment.
        iucn_source = {
            "source": "iucn",
            "reference": f"assessment:{assessment.get('assessment_id')}",
            "assessment_id": assessment.get("assessment_id"),
            "scope": assessment.get("scope"),
            "scope_code": assessment.get("scope_code"),
            "year": assessment.get("year"),
            "retrieved_at": None,
        }
        field_sources["iucn_status"] = iucn_source
        field_sources["iucn_trend"] = iucn_source

    return SpeciesCreate(
        scientific_name=draft["scientific_name"],
        input_scientific_name=draft.get("input_scientific_name"),
        kingdom=taxonomy.get("kingdom"),
        class_name=taxonomy.get("class_name"),
        order_name=taxonomy.get("order_name"),
        family=taxonomy.get("family"),
        genus=taxonomy.get("genus"),
        species_epithet=taxonomy.get("species_epithet"),
        common_name=taxonomy.get("common_name"),
        raw_taxonomy_extra=taxonomy.get("raw_extra"),
        field_sources=field_sources,
        iucn_status=(assessment or {}).get("category") or conservation.get("iucn_status"),
        iucn_trend=(assessment or {}).get("population_trend") or conservation.get("iucn_trend"),
        site_id=site_id,
    )


def dedupe_names(names: list[str]) -> tuple[list[str], list[ImportItemResult]]:
    """Strip/blank-filter and case-insensitively dedupe the input list.

    Returns (unique_names_in_order, results_for_skipped_or_invalid_entries).
    """
    unique = clean_and_dedupe_names(names)
    extras: list[ImportItemResult] = []
    seen: set[str] = set()
    for raw in names:
        name = (raw or "").strip()
        if not name:
            extras.append(ImportItemResult(input_name=raw, status="invalid", error="Empty name"))
        elif name.casefold() in seen:
            extras.append(ImportItemResult(input_name=name, status="skipped_duplicate_in_batch"))
        else:
            seen.add(name.casefold())
    return unique, extras


def _link_if_existing(
    db: Session,
    scientific_name: str,
    site_id: int,
    user_id: int,
    dry_run: bool,
    result: ImportItemResult,
    summary: ImportSummary,
) -> bool:
    """If ``scientific_name`` already exists globally, link it to ``site_id`` (unless
    it already is) and return True; return False when it is a new species.

    A species is a global record; "already in the DB" only means "already
    at *this* site" when a site_species row exists for (site_id, species.id).
    """
    species = species_service.check_duplicate(db, scientific_name)
    if species is None:
        return False

    result.species_id = species.id
    result.resolved_name = species.scientific_name

    already_linked = (
        db.query(SiteSpecies)
        .filter(SiteSpecies.site_id == site_id, SiteSpecies.species_id == species.id)
        .first()
        is not None
    )
    if already_linked:
        result.status = "skipped_duplicate"
        summary.skipped += 1
    elif dry_run:
        result.status = "would_link_existing"
    else:
        species_service.ensure_site_association(db, site_id, species.id, user_id)
        result.status = "linked_existing"
        summary.linked += 1
    return True


def _create_species(db: Session, data: SpeciesCreate, user_id: int) -> int:
    return species_service.create_species(db, data, user_id).id


async def run_bulk_import(
    db: Session,
    names: list[str],
    site_id: int,
    user_id: int,
    delay_seconds: float = DEFAULT_DELAY_SECONDS,
    dry_run: bool = False,
    on_progress: ProgressCallback | None = None,
) -> ImportSummary:
    """Process `names` sequentially, spacing out external calls.

    Safe to re-run. A species that already exists in the DB (matched on the
    input name or the name GBIF resolves it to) is never re-created: if it
    isn't yet associated with `site_id` it is linked to it
    (status "linked_existing"); if it already is, it's skipped.

    Database work goes through a DbRunner: it runs off the event loop and in short
    transactions, so the import does not hold a pooled connection for its whole run.
    """
    if len(names) > MAX_BATCH_SIZE:
        raise ValueError(f"Cannot import more than {MAX_BATCH_SIZE} species in one batch.")

    run_db = species_service.DbRunner(db)

    # Fail fast rather than fail 150 species in.
    await run_db(site_service.get_site, site_id)

    unique_names, extras = dedupe_names(names)
    summary = ImportSummary(total=len(names))
    summary.items.extend(extras)
    summary.invalid = sum(1 for i in extras if i.status == "invalid")
    summary.skipped += sum(1 for i in extras if i.status == "skipped_duplicate_in_batch")

    for idx, name in enumerate(unique_names):
        result = ImportItemResult(input_name=name)
        try:
            linked = await run_db(
                _link_if_existing, name, site_id, user_id, dry_run, result, summary
            )
            if not linked:
                draft = await species_service.lookup_species(run_db, name)
                result.resolved_name = draft.get("scientific_name")

                if "gbif" in draft.get("provider_errors", {}):
                    result.status = "failed"
                    result.error = "GBIF could not be reached; retry this species later."
                    summary.failed += 1
                elif not _has_species_match(draft):
                    result.status = "invalid"
                    result.error = "No species-level match found; check the spelling."
                    summary.invalid += 1
                # The name GBIF resolves a synonym to may already exist
                # even though the raw input name didn't.
                elif await run_db(
                    _link_if_existing,
                    result.resolved_name,
                    site_id,
                    user_id,
                    dry_run,
                    result,
                    summary,
                ):
                    pass
                elif dry_run:
                    result.status = "looked_up"
                else:
                    create_data = _draft_to_species_create(draft, site_id)
                    result.species_id = await run_db(_create_species, create_data, user_id)
                    result.status = "created"
                    summary.created += 1
        except AppException as exc:
            if exc.status_code == 409:
                result.status = "skipped_duplicate"
                summary.skipped += 1
            else:
                result.status = "failed"
                result.error = exc.message
                summary.failed += 1
        except Exception as exc:  # keep the batch going on unexpected per-item errors
            result.status = "failed"
            result.error = public_error_message(exc, "bulk_import_item_failed")
            summary.failed += 1

        summary.items.append(result)

        if on_progress:
            await on_progress(summary)

        is_last = idx == len(unique_names) - 1
        if not is_last and delay_seconds > 0:
            await asyncio.sleep(delay_seconds)

    return summary
