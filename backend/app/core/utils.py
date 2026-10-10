from __future__ import annotations

import shutil
import time
from collections.abc import Iterable
from pathlib import Path


def clean_and_dedupe_names(names: Iterable[str | None]) -> list[str]:
    """Strip, drop blanks and case-insensitively de-duplicate, keeping first-seen order."""
    seen: set[str] = set()
    unique: list[str] = []
    for raw in names:
        name = (raw or "").strip()
        if not name:
            continue
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique.append(name)
    return unique


def purge_old_entries(directory: str | Path, max_age_hours: float, *, skip_hidden: bool = True) -> int:
    """Delete files and sub-directories of ``directory`` not modified for ``max_age_hours``.

    Returns the number of entries removed. Hidden entries (e.g. the graphics ``.cache``)
    are kept by default. Failures are ignored: housekeeping must never break a request.
    """
    root = Path(directory)
    if not root.is_dir() or max_age_hours <= 0:
        return 0
    cutoff = time.time() - max_age_hours * 3600
    removed = 0
    for entry in root.iterdir():
        if skip_hidden and entry.name.startswith("."):
            continue
        try:
            if entry.stat().st_mtime >= cutoff:
                continue
            if entry.is_dir():
                shutil.rmtree(entry, ignore_errors=True)
            else:
                entry.unlink()
            removed += 1
        except OSError:
            continue
    return removed
