from sqlalchemy.orm import Session

from app.models.site import Site
from app.repositories.site_repository import SiteRepository
from app.schemas.site import SiteCreate, SiteUpdate


class SiteService:
    def __init__(self, db: Session):
        self.sites = SiteRepository(db)

    def search(self, query: str | None, limit: int = 50, offset: int = 0) -> list[Site]:
        return self.sites.search(query=query, limit=limit, offset=offset)

    def get(self, site_id: int) -> Site | None:
        return self.sites.get_by_id(site_id)

    def create(self, payload: SiteCreate, created_by: int) -> Site:
        site = Site(name=payload.name, code=payload.code, description=payload.description, created_by=created_by)
        return self.sites.create(site)

    def update(self, site: Site, payload: SiteUpdate) -> Site:
        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(site, field_name, value)
        return self.sites.update(site)

    def delete(self, site: Site) -> None:
        self.sites.delete(site)
