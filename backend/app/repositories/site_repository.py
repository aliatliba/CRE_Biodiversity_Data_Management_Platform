from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.site import Site


class SiteRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, site_id: int) -> Site | None:
        return self.db.get(Site, site_id)

    def search(self, query: str | None, limit: int = 50, offset: int = 0) -> list[Site]:
        stmt = select(Site).order_by(Site.name).limit(limit).offset(offset)
        if query:
            # Site.name is a plain VARCHAR; ilike gives case-insensitive matching,
            # backed by the pg_trgm GIN index created in the schema.
            stmt = stmt.where(Site.name.ilike(f"%{query}%"))
        return list(self.db.execute(stmt).scalars().all())

    def create(self, site: Site) -> Site:
        self.db.add(site)
        self.db.flush()
        return site

    def update(self, site: Site) -> Site:
        self.db.flush()
        return site

    def delete(self, site: Site) -> None:
        self.db.delete(site)
        self.db.flush()
