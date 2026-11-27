"""Site landscape photos

site_photos holds at most one image per site (bytes in the database: the API's
filesystem is not kept across deploys). sites.photo_updated_at is NULL when the site
has no photo and otherwise versions the photo URL, so clients can cache it.

Revision ID: 009
Revises: 008
Create Date: 2026-11-27
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sites", sa.Column("photo_updated_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "site_photos",
        sa.Column("site_id", sa.BigInteger(), nullable=False),
        sa.Column("content_type", sa.String(length=50), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_by", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("site_id"),
    )


def downgrade() -> None:
    op.drop_table("site_photos")
    op.drop_column("sites", "photo_updated_at")
