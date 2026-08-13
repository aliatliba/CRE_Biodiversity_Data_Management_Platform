from datetime import datetime, timezone

from sqlalchemy import Column, BigInteger, String, Text, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship

from app.core.db import Base


class Site(Base):
    __tablename__ = "sites"

    id = Column(BigInteger, primary_key=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=True)
    description = Column(Text, nullable=True)
    created_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    creator = relationship("User")

    __table_args__ = (
        Index("ix_sites_name_trgm", "name", postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"}),
    )
