"""CLI for bulk-importing species by scientific name.

Looks up each name against the external providers (GBIF, IUCN, POWO,
Wikidata, iNaturalist) via the same code path the API uses
(`species_service.lookup_species`), then inserts a validated species
record for each new one, associated with the given site. A configurable
delay is inserted between species to stay under the external providers'
rate limits — this talks to the DB directly, so it's meant to be run
from a shell (locally, in a container, or as a one-off job), not from a
browser.

Usage:
    # from a file, one scientific name per line (blank lines and lines
    # starting with # are ignored)
    python -m app.scripts.bulk_import_species \\
        --input names.txt --site-id 1 --user-id 1

    # inline
    python -m app.scripts.bulk_import_species \\
        --names "Panthera leo, Quercus suber" --site-id 1 --user-id 1

    # piped
    cat names.txt | python -m app.scripts.bulk_import_species --site-id 1 --user-id 1

Add --dry-run to only run the lookups (no DB writes), so you can review
what would be imported before committing to it. Add --report out.csv to
save a per-species result log. Re-running the same list is safe — species
that already exist (by input name or by the name GBIF resolves it to)
are skipped rather than duplicated or errored on, so a batch that
partially failed can just be re-submitted.
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from dataclasses import asdict
from pathlib import Path

from app.core.db import SessionLocal
from app.services.bulk_import_service import MAX_BATCH_SIZE, ImportSummary, run_bulk_import


def _read_names(args: argparse.Namespace) -> list[str]:
    if args.names:
        raw = args.names.split(",")
    elif args.input:
        raw = Path(args.input).read_text(encoding="utf-8").splitlines()
    else:
        raw = sys.stdin.read().splitlines()
    return [line.strip() for line in raw if line.strip() and not line.strip().startswith("#")]


def _write_report(path: str, summary: ImportSummary) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["input_name", "resolved_name", "status", "species_id", "error"]
        )
        writer.writeheader()
        for item in summary.items:
            writer.writerow(asdict(item))


async def _amain(args: argparse.Namespace) -> int:
    names = _read_names(args)
    if not names:
        print("No species names provided (use --input, --names, or pipe via stdin).", file=sys.stderr)
        return 1
    if len(names) > MAX_BATCH_SIZE:
        print(
            f"{len(names)} names given, which is over the {MAX_BATCH_SIZE}-per-run limit. "
            "Split the list into smaller batches.",
            file=sys.stderr,
        )
        return 1

    print(
        f"Importing {len(names)} species (delay={args.delay}s between each, "
        f"dry_run={args.dry_run}, site_id={args.site_id})...\n"
    )

    async def on_progress(summary: ImportSummary) -> None:
        last = summary.items[-1]
        done = len(summary.items)
        line = f"[{done}/{len(names)}] {last.input_name!r} -> {last.status}"
        if last.species_id:
            line += f" (id={last.species_id})"
        if last.resolved_name and last.resolved_name.lower() != last.input_name.lower():
            line += f" [resolved: {last.resolved_name}]"
        if last.error:
            line += f" — {last.error}"
        print(line)

    db = SessionLocal()
    try:
        summary = await run_bulk_import(
            db=db,
            names=names,
            site_id=args.site_id,
            user_id=args.user_id,
            delay_seconds=args.delay,
            dry_run=args.dry_run,
            on_progress=on_progress,
        )
    finally:
        db.close()

    print(
        f"\nDone. created={summary.created} skipped={summary.skipped} "
        f"failed={summary.failed} invalid={summary.invalid} total_input={summary.total}"
    )

    if args.report:
        _write_report(args.report, summary)
        print(f"Report written to {args.report}")

    return 1 if summary.failed else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Bulk import species by scientific name.")
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--input", help="Path to a text file, one scientific name per line.")
    source.add_argument("--names", help="Comma-separated list of scientific names.")
    parser.add_argument("--site-id", type=int, required=True, help="Site to associate the species with.")
    parser.add_argument("--user-id", type=int, required=True, help="User id recorded as creator/validator.")
    parser.add_argument(
        "--delay", type=float, default=1.5,
        help="Seconds to wait between species, to respect external API rate limits. Default 1.5.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Only run lookups; don't write to the DB.")
    parser.add_argument("--report", default=None, help="Optional path to write a CSV result report to.")
    args = parser.parse_args()

    exit_code = asyncio.run(_amain(args))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()