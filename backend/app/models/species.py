from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import CITEXT, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Species(Base):
    """Canonical species record — one row per scientific name.

    field_sources stores per-field provenance as JSONB rather than a separate
    child table: sourcing is only ever read alongside the species row itself
    (list/detail/export views), so keeping it inline avoids a join on every
    read. See README Section 4.3 for the full rationale.
    """

    __tablename__ = "species"
    __table_args__ = (
        CheckConstraint("national_status IN ('Protected', 'Non Protected')", name="ck_species_national_status"),
        CheckConstraint("status IN ('draft', 'validated')", name="ck_species_status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    scientific_name: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)

    # Taxonomy — nullable by design: never invent missing taxonomy.
    kingdom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    class_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    order_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    family: Mapped[str | None] = mapped_column(String(100), nullable=True)
    genus: Mapped[str | None] = mapped_column(String(100), nullable=True)
    species_epithet: Mapped[str | None] = mapped_column(String(100), nullable=True)
    common_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_taxonomy_extra: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # Field-level provenance, e.g. {"kingdom": {"source": "gbif", "reference": "..."}}
    field_sources: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # Conservation status
    iucn_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    iucn_trend: Mapped[str | None] = mapped_column(String(50), nullable=True)
    national_status: Mapped[str] = mapped_column(String(20), nullable=False, default="Non Protected")

    # Ecological traits
    guild: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ecosystem_service: Mapped[str | None] = mapped_column(Text, nullable=True)
    habitat: Mapped[str | None] = mapped_column(Text, nullable=True)
    typology: Mapped[str | None] = mapped_column(String(255), nullable=True)
    endemism: Mapped[str | None] = mapped_column(String(255), nullable=True)
    potential_threats: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Workflow / audit
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    validated_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def apply_field(self, field_name: str, value: Any, source: str, reference: str | None = None) -> None:
        """Sets a field's value and records its provenance in field_sources."""
        setattr(self, field_name, value)
        sources = dict(self.field_sources or {})
        entry: dict[str, Any] = {"source": source}
        if reference:
            entry["reference"] = reference
        sources[field_name] = entry
        self.field_sources = sources
