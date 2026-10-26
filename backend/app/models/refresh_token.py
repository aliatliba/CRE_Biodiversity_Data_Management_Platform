from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String

from app.core.db import Base


class RefreshToken(Base):
    """One issued refresh token. Every refresh rotates it: the presented row is
    revoked and a new one is issued in the same ``family_id`` (one family per
    sign-in). Presenting an already-revoked token means it was copied, so the whole
    family is revoked (see auth_service.refresh_access_token)."""

    __tablename__ = "refresh_tokens"

    id = Column(BigInteger, primary_key=True)
    jti = Column(String(64), unique=True, nullable=False)
    family_id = Column(String(64), nullable=False, index=True)
    user_id = Column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
