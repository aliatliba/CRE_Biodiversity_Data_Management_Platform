"""Site designations (Ramsar, UNESCO MAB, IBA, KBA, national park...)

site_designations links a site to designation ids from app.core.designations.CATALOG.
The ids are validated by the API, not by a database constraint, so adding a
designation to the catalog needs no migration.

Revision ID: 008
Revises: 007
Create Date: 2026-11-19
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "site_designations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("site_id", sa.BigInteger(), nullable=False),
        sa.Column("designation_id", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "site_id", "designation_id", name="uq_site_designations_site_designation"
        ),
    )
    op.create_index("ix_site_designations_site_id", "site_designations", ["site_id"])


def downgrade() -> None:
    op.drop_index("ix_site_designations_site_id", table_name="site_designations")
    op.drop_table("site_designations")
