from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class SiteSpecies(Base):
    """Many-to-many link: a species recorded at a site.

    Species are canonical (one row in `species` regardless of how many sites
    record them); this table is what a new site association creates instead
    of duplicating the species row. See README Section 4.1.
    """

    __tablename__ = "site_species"
    __table_args__ = (UniqueConstraint("site_id", "species_id", name="uq_site_species"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    site_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sites.id"), nullable=False)
    species_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("species.id"), nullable=False)
    recorded_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
