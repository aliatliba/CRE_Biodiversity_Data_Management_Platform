import httpx
from typing import Any
from abc import ABC, abstractmethod


class HttpClientMixin:
    def __init__(self, base_url: str, timeout: float = 5.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout,follow_redirects=True,
                                        headers={
                "User-Agent": "BiodiversityPlatform/1.0 (contact: a.tliba2004@gmail.com)",
                "Accept": "application/json",
            })          # was httpx.Client

    async def get(self, path: str, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> httpx.Response:
        url = f"{self.base_url}/{path.lstrip('/')}"
        return await self.client.get(url, params=params, headers=headers)  # was: return self.client.get(...)

    async def close(self) -> None:
        await self.client.aclose()                                # was self.client.close()


class ProviderResult:
    def __init__(self, source: str, data: dict[str, Any]):
        self.source = source
        self.data = data


class ExternalProviderClient(ABC):
    @abstractmethod
    async def search(self, scientific_name: str) -> ProviderResult:  # add async
        pass