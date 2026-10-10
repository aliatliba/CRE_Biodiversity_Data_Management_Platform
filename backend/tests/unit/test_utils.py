import os
import time

from app.core.utils import clean_and_dedupe_names, purge_old_entries


def test_clean_and_dedupe_names():
    assert clean_and_dedupe_names([" Panthera leo ", "", None, "panthera LEO", "Quercus suber"]) == [
        "Panthera leo",
        "Quercus suber",
    ]


def test_purge_old_entries(tmp_path):
    old_file = tmp_path / "old.csv"
    old_file.write_text("x")
    new_file = tmp_path / "new.csv"
    new_file.write_text("x")
    old_dir = tmp_path / "job_old"
    old_dir.mkdir()
    cache = tmp_path / ".cache"
    cache.mkdir()
    past = time.time() - 48 * 3600
    for path in (old_file, old_dir, cache):
        os.utime(path, (past, past))

    assert purge_old_entries(tmp_path, 24) == 2
    assert not old_file.exists() and not old_dir.exists()
    assert new_file.exists() and cache.exists()
