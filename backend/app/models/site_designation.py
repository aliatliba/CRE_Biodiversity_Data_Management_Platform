from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, UniqueConstraint

from app.core.db import Base


class SiteDesignation(Base):
    """A designation (Ramsar, UNESCO MAB, IBA...) carried by a site.

    ``designation_id`` is an id from app.core.designations.CATALOG, validated by the
    API rather than by the database, so adding a designation needs no migration.
    """

    __tablename__ = "site_designations"

    id = Column(BigInteger, primary_key=True)
    site_id = Column(
        BigInteger, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    designation_id = Column(String(50), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("site_id", "designation_id", name="uq_site_designations_site_designation"),
    )
