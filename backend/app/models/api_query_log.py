from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ApiQueryLog(Base):
    """Debugging/traceability record for every external provider call."""

    __tablename__ = "api_query_log"
    __table_args__ = (
        CheckConstraint("status IN ('success', 'error', 'not_found')", name="ck_api_query_log_status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    species_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("species.id"), nullable=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    query_term: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    response_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    requested_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
