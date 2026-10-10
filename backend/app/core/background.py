"""Fire-and-forget asyncio tasks that cannot be garbage-collected mid-flight.

``asyncio.create_task`` only keeps a *weak* reference to the task, so a task nobody
else references can be collected before it finishes. We hold strong references in a
module-level set and drop them in a done-callback.
"""
from __future__ import annotations

import asyncio
from collections.abc import Coroutine
from typing import Any

_background_tasks: set[asyncio.Task[Any]] = set()


def spawn(coro: Coroutine[Any, Any, Any]) -> asyncio.Task[Any]:
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task
