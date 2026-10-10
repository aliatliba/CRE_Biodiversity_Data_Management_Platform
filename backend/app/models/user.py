from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy import Column, BigInteger, String, ForeignKey, Boolean, DateTime, SmallInteger
from sqlalchemy.orm import relationship

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True)
    email = Column(CITEXT, unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=True)
    role_id = Column(SmallInteger, ForeignKey("roles.id"), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    must_change_password = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    role = relationship("Role", back_populates="users")
