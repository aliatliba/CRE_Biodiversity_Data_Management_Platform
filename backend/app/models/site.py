from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship

from app.core.db import Base
from app.core.designations import resolve


class Site(Base):
    __tablename__ = "sites"

    id = Column(BigInteger, primary_key=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=True)
    description = Column(Text, nullable=True)
    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    # NULL: no photo. Otherwise when the photo (site_photos) last changed; clients
    # use it to version the photo URL.
    photo_updated_at = Column(DateTime(timezone=True), nullable=True)

    creator = relationship("User")
    # Loaded with one extra query for all sites of a result (selectin): no N+1 on lists.
    # Rows are removed by the database (ON DELETE CASCADE) when the site is deleted.
    designation_links = relationship(
        "SiteDesignation",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def designations(self) -> list[dict]:
        """The site's designations as catalog entries, in catalog order, each with
        this site's own ``url`` (None when the admin has not set one)."""
        urls = {link.designation_id: link.url for link in self.designation_links}
        return [{**entry, "url": urls.get(entry["id"])} for entry in resolve(urls)]

    __table_args__ = (
        Index("ix_sites_name_trgm", "name", postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"}),
    )
