"""Protected species list rebuilt from the verified 2012 decrees

- protected_species_list gets the decree, taxonomic group, family, French and Arabic
  names and the outcome of the name check
- protected_species_names: every name that marks a recorded species as protected
  (accepted name, synonyms, spelling variants) plus the names as printed in the decree
- the rows seeded from the old, unverified extraction of the decrees are deleted; the
  startup seed (app.services.protected_species_service.sync_decree_list) inserts the
  verified list and recomputes Species.national_status. Rows added by administrators
  are kept.

Revision ID: 007
Revises: 006
Create Date: 2026-11-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# source_reference of every row seeded from the old protected_species_dz.json
OLD_SEED_REFERENCE = "Décret exécutif n° 12-%"


def upgrade() -> None:
    for name, type_ in (
        ("decree", sa.String(20)),
        ("kingdom", sa.String(50)),
        ("taxon_group", sa.String(50)),
        ("family", sa.String(100)),
        ("common_name_fr", sa.Text()),
        ("common_name_ar", sa.Text()),
        ("verification_status", sa.String(50)),
        ("verification_note", sa.Text()),
    ):
        op.add_column("protected_species_list", sa.Column(name, type_, nullable=True))
    op.create_index(
        "ix_protected_species_list_taxon_group", "protected_species_list", ["taxon_group"]
    )

    op.create_table(
        "protected_species_names",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("protected_species_id", sa.BigInteger(), nullable=False),
        sa.Column("name", postgresql.CITEXT(), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.ForeignKeyConstraint(
            ["protected_species_id"], ["protected_species_list.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_protected_species_names_protected_species_id",
        "protected_species_names",
        ["protected_species_id"],
    )
    op.create_index(
        "uq_protected_species_names_match",
        "protected_species_names",
        ["name"],
        unique=True,
        postgresql_where=sa.text("kind = 'match'"),
    )

    op.execute(
        sa.text("DELETE FROM protected_species_list WHERE source_reference LIKE :ref").bindparams(
            ref=OLD_SEED_REFERENCE
        )
    )
    # Entries added by administrators keep matching on their own name.
    op.execute(
        "INSERT INTO protected_species_names (protected_species_id, name, kind) "
        "SELECT id, scientific_name, 'match' FROM protected_species_list"
    )


def downgrade() -> None:
    op.drop_index("uq_protected_species_names_match", table_name="protected_species_names")
    op.drop_index(
        "ix_protected_species_names_protected_species_id", table_name="protected_species_names"
    )
    op.drop_table("protected_species_names")
    op.drop_index("ix_protected_species_list_taxon_group", table_name="protected_species_list")
    for name in (
        "verification_note",
        "verification_status",
        "common_name_ar",
        "common_name_fr",
        "family",
        "taxon_group",
        "kingdom",
        "decree",
    ):
        op.drop_column("protected_species_list", name)
