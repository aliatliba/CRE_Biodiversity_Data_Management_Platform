from datetime import datetime, timezone

from sqlalchemy import Column, BigInteger, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.core.db import Base


class ProtectedSpeciesList(Base):
    __tablename__ = "protected_species_list"

    id = Column(BigInteger, primary_key=True)
    scientific_name = Column(String, unique=True, nullable=False)
    source_reference = Column(Text, nullable=True)
    added_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    adder = relationship("User")
