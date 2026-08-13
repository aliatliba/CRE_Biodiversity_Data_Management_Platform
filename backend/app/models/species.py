from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    BigInteger,
    String,
    ForeignKey,
    DateTime,
    Index,
    CheckConstraint,
    Text
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.db import Base


class Species(Base):
    __tablename__ = "species"

    id = Column(BigInteger, primary_key=True)
    scientific_name = Column(String, unique=True, nullable=False)
    kingdom = Column(String(100), nullable=True)
    class_name = Column(String(100), nullable=True)
    order_name = Column(String(100), nullable=True)
    family = Column(String(100), nullable=True)
    genus = Column(String(100), nullable=True)
    species_epithet = Column(String(100), nullable=True)
    common_name = Column(String(255), nullable=True)
    raw_taxonomy_extra = Column(JSONB, nullable=True)
    field_sources = Column(JSONB, nullable=True)
    iucn_status = Column(String(50), nullable=True)
    iucn_trend = Column(String(50), nullable=True)
    national_status = Column(
        String(50), nullable=False, default="Non Protected"
    )
    guild = Column(String(255), nullable=True)
    ecosystem_service = Column(Text, nullable=True)
    habitat = Column(Text, nullable=True)
    typology = Column(String(255), nullable=True)
    endemism = Column(String(255), nullable=True)
    potential_threats = Column(Text, nullable=True)
    reference = Column(Text, nullable=True)
    status = Column(
        String(20), nullable=False, default="draft"
    )
    created_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    validated_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    creator = relationship("User", foreign_keys=[created_by])
    validator = relationship("User", foreign_keys=[validated_by])

    __table_args__ = (
        CheckConstraint("status IN ('draft', 'validated')", name="ck_species_status"),
        Index("ix_species_family_genus", "family", "genus"),
        Index("ix_species_status", "status"),
    )
