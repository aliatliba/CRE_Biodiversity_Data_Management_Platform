"""Remove non-species rows that were seeded into protected_species_list

The Algerian plant decree's PDF contained a few job-title lines ("Assistants
sociaux", ...) that were imported as species. They were removed from
app/data/protected_species_dz.json; this deletes them from databases that were
already seeded. Nothing references protected_species_list by foreign key.

Revision ID: 004
Revises: 003
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

JUNK_NAMES = ("Assistants sociaux", "Comptables administratifs", "Ouvriers professionnels")


def upgrade() -> None:
    # scientific_name is CITEXT, so the match is case-insensitive.
    op.execute(
        sa.text("DELETE FROM protected_species_list WHERE scientific_name IN :names").bindparams(
            sa.bindparam("names", value=JUNK_NAMES, expanding=True)
        )
    )


def downgrade() -> None:
    # The deleted rows were invalid data; there is nothing to restore.
    pass
