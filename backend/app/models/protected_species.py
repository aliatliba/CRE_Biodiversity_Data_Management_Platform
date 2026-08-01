from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ProtectedSpeciesList(Base):
    """The organization's own reference list, used to compute Species.national_status."""

    __tablename__ = "protected_species_list"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    scientific_name: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    source_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    added_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
