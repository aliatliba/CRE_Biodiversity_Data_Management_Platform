"""Shared abstraction every external biodiversity-data provider implements.

Adding a new provider later means: one new class implementing
ExternalProviderClient, one mapper entry, and registering it in
SpeciesLookupService — nothing else in the app changes.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProviderResult:
    provider: str
    found: bool
    raw_fields: dict[str, Any] = field(default_factory=dict)
    reference: str | None = None
    error: str | None = None


class ExternalProviderClient(ABC):
    provider_name: str

    @abstractmethod
    async def search(self, scientific_name: str) -> ProviderResult:
        """Looks up a scientific name and returns whatever this provider knows.

        Must never raise on a "not found" or network/timeout condition — those
        are reported via ProviderResult.found / ProviderResult.error so that
        one provider's failure never blocks the other providers' results.
        """
        raise NotImplementedError
