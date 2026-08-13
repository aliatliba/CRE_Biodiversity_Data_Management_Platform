from datetime import datetime, timezone

from sqlalchemy import Column, BigInteger, String, ForeignKey, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.db import Base


class SpeciesValidationHistory(Base):
    __tablename__ = "species_validation_history"

    id = Column(BigInteger, primary_key=True)
    species_id = Column(BigInteger, ForeignKey("species.id"), nullable=False)
    action = Column(String(20), nullable=False)
    changed_fields = Column(JSONB, nullable=False)
    validated_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    validated_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    species = relationship("Species")
    validator = relationship("User")

    __table_args__ = (
        Index("ix_validation_history_species_id", "species_id"),
        Index("ix_validation_history_validated_at", "validated_at"),
    )
