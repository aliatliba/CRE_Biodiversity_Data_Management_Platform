from datetime import datetime, timezone

from sqlalchemy import Column, BigInteger, ForeignKey, Text, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from app.core.db import Base


class SiteSpecies(Base):
    __tablename__ = "site_species"

    id = Column(BigInteger, primary_key=True)
    site_id = Column(BigInteger, ForeignKey("sites.id"), nullable=False)
    species_id = Column(BigInteger, ForeignKey("species.id"), nullable=False)
    recorded_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    site = relationship("Site")
    species = relationship("Species")
    recorder = relationship("User")

    __table_args__ = (
        UniqueConstraint("site_id", "species_id", name="uq_site_species"),
        Index("ix_site_species_site_id", "site_id"),
        Index("ix_site_species_species_id", "species_id"),
    )
