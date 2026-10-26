from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    cast,
    literal_column,
    or_,
)
from sqlalchemy.dialects.postgresql import CITEXT, JSONB
from sqlalchemy.orm import relationship

from app.core.db import Base


class Species(Base):
    __tablename__ = "species"

    id = Column(BigInteger, primary_key=True)
    scientific_name = Column(CITEXT, unique=True, nullable=False)
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
    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    validated_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    creator = relationship("User", foreign_keys=[created_by])
    validator = relationship("User", foreign_keys=[validated_by])

    __table_args__ = (
        CheckConstraint("status IN ('draft', 'validated')", name="ck_species_status"),
        Index("ix_species_family_genus", "family", "genus"),
        Index("ix_species_status", "status"),
        Index("ix_species_iucn_status", "iucn_status"),
        Index("ix_species_national_status", "national_status"),
        Index("ix_species_kingdom", "kingdom"),
        # Trigram indexes for ILIKE '%term%' search. scientific_name is CITEXT, which
        # has no trigram operator class, so it is indexed (and searched) as text.
        Index(
            "ix_species_scientific_name_trgm",
            literal_column("(scientific_name::text) gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "ix_species_common_name_trgm",
            "common_name",
            postgresql_using="gin",
            postgresql_ops={"common_name": "gin_trgm_ops"},
        ),
    )


def escape_like(term: str) -> str:
    """Make ``%``, ``_`` and ``\\`` in user input match literally in (I)LIKE patterns
    (use with ``escape="\\"``)."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def name_search_filter(term: str):
    """Case-insensitive substring match on scientific or common name (uses the trigram indexes)."""
    pattern = f"%{escape_like(term)}%"
    return or_(
        cast(Species.scientific_name, Text).ilike(pattern, escape="\\"),
        Species.common_name.ilike(pattern, escape="\\"),
    )
