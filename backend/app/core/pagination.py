from typing import Generic, TypeVar, Sequence
from pydantic import BaseModel

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class Page(BaseModel, Generic[T]):
    items: Sequence[T]
    total: int
    page: int
    page_size: int
    pages: int


def paginate(items: Sequence[T], total: int, params: PaginationParams) -> Page[T]:
    pages = (total + params.page_size - 1) // params.page_size
    return Page(
        items=items,
        total=total,
        page=params.page,
        page_size=params.page_size,
        pages=pages,
    )
