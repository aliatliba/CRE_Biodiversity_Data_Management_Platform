from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import relationship

from app.core.db import Base


class ProtectedSpeciesList(Base):
    """One protected taxon.

    Entries with ``decree`` set come from Algeria's 2012 decrees and are kept in sync
    with app/data/protected_species_dz.json at startup; entries without it were added
    by an administrator.
    """

    __tablename__ = "protected_species_list"

    id = Column(BigInteger, primary_key=True)
    # Name shown in the app: the current accepted name, without author.
    scientific_name = Column(CITEXT, unique=True, nullable=False)
    source_reference = Column(Text, nullable=True)
    decree = Column(String(20), nullable=True)
    kingdom = Column(String(50), nullable=True)
    taxon_group = Column(String(50), nullable=True)
    family = Column(String(100), nullable=True)
    common_name_fr = Column(Text, nullable=True)
    common_name_ar = Column(Text, nullable=True)
    # Outcome of the name check against current nomenclature: OK, Spelling, Outdated,
    # Spelling+Outdated, Taxonomic note, Unverified/doubtful.
    verification_status = Column(String(50), nullable=True)
    verification_note = Column(Text, nullable=True)
    added_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    adder = relationship("User")
    names = relationship(
        "ProtectedSpeciesName",
        back_populates="entry",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProtectedSpeciesName.id",
    )

    __table_args__ = (Index("ix_protected_species_list_taxon_group", "taxon_group"),)


class ProtectedSpeciesName(Base):
    """A name that marks a recorded species as protected.

    kind = "match": the entry's name, a synonym or a spelling variant; a species whose
    scientific name equals one of these (case-insensitively) is Protected.
    kind = "printed": the name as printed in the decree, kept for display and search
    only (many are garbled, so they never mark a species).
    """

    __tablename__ = "protected_species_names"

    id = Column(BigInteger, primary_key=True)
    protected_species_id = Column(
        BigInteger,
        ForeignKey("protected_species_list.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(CITEXT, nullable=False)
    kind = Column(String(20), nullable=False, default="match")

    entry = relationship("ProtectedSpeciesList", back_populates="names")

    __table_args__ = (
        # A matching name points to one taxon only (and is looked up on every species save).
        Index(
            "uq_protected_species_names_match",
            "name",
            unique=True,
            postgresql_where=text("kind = 'match'"),
        ),
    )
