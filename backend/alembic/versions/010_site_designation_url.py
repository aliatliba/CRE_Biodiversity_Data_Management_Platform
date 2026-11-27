"""Site designations: website link

site_designations.url is the page of this site for that designation (e.g. the site's
Ramsar Sites Information Service page), set by an admin. NULL: no link.

Revision ID: 010
Revises: 009
Create Date: 2026-11-27
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("site_designations", sa.Column("url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("site_designations", "url")
