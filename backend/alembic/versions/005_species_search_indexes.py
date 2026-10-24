"""Indexes for species search and filtering

- GIN trigram indexes for ILIKE '%term%' on scientific_name (indexed as text, because
  CITEXT has no trigram operator class) and common_name
- btree indexes on iucn_status, national_status and kingdom (dashboard and list filters)

Revision ID: 005
Revises: 004
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX ix_species_scientific_name_trgm ON species "
        "USING gin ((scientific_name::text) gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_species_common_name_trgm ON species "
        "USING gin (common_name gin_trgm_ops)"
    )
    op.create_index("ix_species_iucn_status", "species", ["iucn_status"])
    op.create_index("ix_species_national_status", "species", ["national_status"])
    op.create_index("ix_species_kingdom", "species", ["kingdom"])


def downgrade() -> None:
    op.drop_index("ix_species_kingdom", table_name="species")
    op.drop_index("ix_species_national_status", table_name="species")
    op.drop_index("ix_species_iucn_status", table_name="species")
    op.execute("DROP INDEX IF EXISTS ix_species_common_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_species_scientific_name_trgm")
