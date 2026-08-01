from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class SpeciesValidationHistory(Base):
    """Append-only audit trail. Never updated or deleted from the app layer."""

    __tablename__ = "species_validation_history"
    __table_args__ = (CheckConstraint("action IN ('created', 'updated')", name="ck_validation_history_action"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    species_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("species.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_fields: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    validated_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    validated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
