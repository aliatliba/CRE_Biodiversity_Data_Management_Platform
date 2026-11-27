from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, LargeBinary, String

from app.core.db import Base


class SitePhoto(Base):
    """The landscape photo of a site (at most one per site).

    Stored in the database rather than on disk: the API's filesystem is not kept
    across deploys. Kept out of ``sites`` so listing sites never loads image bytes;
    ``Site.photo_updated_at`` tells clients whether a photo exists and which version.
    Removed by the database (ON DELETE CASCADE) when the site is deleted.
    """

    __tablename__ = "site_photos"

    site_id = Column(
        BigInteger, ForeignKey("sites.id", ondelete="CASCADE"), primary_key=True
    )
    content_type = Column(String(50), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    data = Column(LargeBinary, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
