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

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.schemas.species import SpeciesCreate
from app.services import site_service, species_service

DEFAULT_DELAY_SECONDS = 1.5
MAX_BATCH_SIZE = 300

ProgressCallback = Callable[["ImportSummary"], Awaitable[None]]


@dataclass
class ImportItemResult:
    input_name: str
    resolved_name: str | None = None
    # pending | created | looked_up | skipped_duplicate |
    # skipped_duplicate_in_batch | invalid | failed
    status: str = "pending"
    species_id: int | None = None
    error: str | None = None


@dataclass
class ImportSummary:
    total: int
    created: int = 0
    skipped: int = 0
    failed: int = 0
    invalid: int = 0
    items: list[ImportItemResult] = field(default_factory=list)


def _draft_to_species_create(draft: dict[str, Any], site_id: int) -> SpeciesCreate:
    taxonomy = draft.get("taxonomy", {})
    conservation = draft.get("conservation", {})
    return SpeciesCreate(
        scientific_name=draft["scientific_name"],
        kingdom=taxonomy.get("kingdom"),
        class_name=taxonomy.get("class_name"),
        order_name=taxonomy.get("order_name"),
        family=taxonomy.get("family"),
        genus=taxonomy.get("genus"),
        species_epithet=taxonomy.get("species_epithet"),
        common_name=taxonomy.get("common_name"),
        raw_taxonomy_extra=taxonomy.get("raw_extra"),
        field_sources=draft.get("field_sources"),
        iucn_status=conservation.get("iucn_status"),
        iucn_trend=conservation.get("iucn_trend"),
        site_id=site_id,
    )


def dedupe_names(names: list[str]) -> tuple[list[str], list[ImportItemResult]]:
    """Strip/blank-filter and case-insensitively dedupe the input list.

    Returns (unique_names_in_order, results_for_skipped_or_invalid_entries).
    """
    seen: set[str] = set()
    unique: list[str] = []
    extras: list[ImportItemResult] = []
    for raw in names:
        name = (raw or "").strip()
        if not name:
            extras.append(ImportItemResult(input_name=raw, status="invalid", error="Empty name"))
            continue
        key = name.lower()
        if key in seen:
            extras.append(ImportItemResult(input_name=name, status="skipped_duplicate_in_batch"))
            continue
        seen.add(key)
        unique.append(name)
    return unique, extras


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

    Safe to re-run: species that already exist in the DB (matched either
    on the input name or the name GBIF resolves it to) are skipped, not
    re-inserted or errored on, so a failed batch can just be re-submitted.
    """
    if len(names) > MAX_BATCH_SIZE:
        raise ValueError(f"Cannot import more than {MAX_BATCH_SIZE} species in one batch.")

    # Fail fast rather than fail 150 species in.
    site_service.get_site(db, site_id)

    unique_names, extras = dedupe_names(names)
    summary = ImportSummary(total=len(names))
    summary.items.extend(extras)
    summary.invalid = sum(1 for i in extras if i.status == "invalid")
    summary.skipped += sum(1 for i in extras if i.status == "skipped_duplicate_in_batch")

    for idx, name in enumerate(unique_names):
        result = ImportItemResult(input_name=name)
        try:
            existing = species_service.check_duplicate(db, name)
            if existing:
                result.status = "skipped_duplicate"
                result.species_id = existing.id
                result.resolved_name = existing.scientific_name
                summary.skipped += 1
            else:
                draft = await species_service.lookup_species(name)
                result.resolved_name = draft.get("scientific_name")

                if dry_run:
                    result.status = "looked_up"
                else:
                    # The name GBIF resolves a synonym to may already exist
                    # even though the raw input name didn't.
                    resolved_existing = species_service.check_duplicate(db, result.resolved_name)
                    if resolved_existing:
                        result.status = "skipped_duplicate"
                        result.species_id = resolved_existing.id
                        summary.skipped += 1
                    else:
                        create_data = _draft_to_species_create(draft, site_id)
                        species = species_service.create_species(db, create_data, user_id)
                        result.status = "created"
                        result.species_id = species.id
                        summary.created += 1
        except HTTPException as exc:
            db.rollback()
            if exc.status_code == 409:
                result.status = "skipped_duplicate"
                summary.skipped += 1
            else:
                result.status = "failed"
                result.error = str(exc.detail)
                summary.failed += 1
        except Exception as exc:  # keep the batch going on unexpected per-item errors
            db.rollback()
            result.status = "failed"
            result.error = str(exc)
            summary.failed += 1

        summary.items.append(result)

        if on_progress:
            await on_progress(summary)

        is_last = idx == len(unique_names) - 1
        if not is_last and delay_seconds > 0:
            await asyncio.sleep(delay_seconds)

    return summary