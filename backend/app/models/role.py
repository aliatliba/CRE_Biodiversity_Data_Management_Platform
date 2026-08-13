from sqlalchemy import Column, SmallInteger, String, Text
from sqlalchemy.orm import relationship

from app.core.db import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(SmallInteger, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    users = relationship("User", back_populates="role")
