from datetime import datetime, timezone

from sqlalchemy import Column, BigInteger, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.db import Base


class Export(Base):
    __tablename__ = "exports"

    id = Column(BigInteger, primary_key=True)
    requested_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    format = Column(String(10), nullable=False)
    filters = Column(JSONB, nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    file_path = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)

    requester = relationship("User")
