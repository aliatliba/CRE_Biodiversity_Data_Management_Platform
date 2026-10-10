from __future__ import annotations

import time
from collections import OrderedDict
from typing import Generic, TypeVar

V = TypeVar("V")


class TTLCache(Generic[V]):
    """Small in-process cache with per-entry expiry and a size cap (oldest evicted first)."""

    def __init__(self, ttl_seconds: float, max_size: int = 2048) -> None:
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self._data: OrderedDict[str, tuple[float, V]] = OrderedDict()

    def get(self, key: str) -> V | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at < time.monotonic():
            del self._data[key]
            return None
        return value

    def set(self, key: str, value: V) -> None:
        self._data[key] = (time.monotonic() + self.ttl_seconds, value)
        self._data.move_to_end(key)
        while len(self._data) > self.max_size:
            self._data.popitem(last=False)

    def clear(self) -> None:
        self._data.clear()

    def __len__(self) -> int:
        return len(self._data)
