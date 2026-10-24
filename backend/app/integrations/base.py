from abc import ABC, abstractmethod
from typing import Any

import httpx

DEFAULT_HEADERS = {
    "User-Agent": "BiodiversityPlatform/1.0 (contact: a.tliba2004@gmail.com)",
    "Accept": "application/json",
}

# One shared AsyncClient (connection pooling / keep-alive) for every provider call.
# ``lifespan`` creates it at startup and closes it on shutdown; it is also created
# lazily so scripts and tests that never run ``lifespan`` keep working.
_http_client: httpx.AsyncClient | None = None


def init_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            follow_redirects=True,
            headers=DEFAULT_HEADERS,
            timeout=5.0,
        )
    return _http_client


def get_http_client() -> httpx.AsyncClient:
    return init_http_client()


async def close_http_client() -> None:
    global _http_client
    client, _http_client = _http_client, None
    if client is not None and not client.is_closed:
        await client.aclose()


class HttpClientMixin:
    def __init__(self, base_url: str, timeout: float = 5.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        url = f"{self.base_url}/{path.lstrip('/')}"
        return await get_http_client().get(
            url, params=params, headers=headers, timeout=self.timeout
        )


class ProviderResult:
    def __init__(self, source: str, data: dict[str, Any], error: str | None = None):
        self.source = source
        self.data = data
        # Set when the provider could not be queried (network error, HTTP error, missing
        # credentials...), so "provider failed" is distinguishable from "no data found".
        self.error = error


def describe_error(exc: BaseException) -> str:
    return str(exc) or exc.__class__.__name__


class ExternalProviderClient(ABC):
    source: str

    @abstractmethod
    async def search(self, scientific_name: str) -> ProviderResult:
        pass
