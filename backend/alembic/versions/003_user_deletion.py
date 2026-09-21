"""Allow permanent user deletion while preserving biodiversity records

revision = "003"
down_revision = "002"
Create Date: 2026-09-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_user_foreign_keys(table_name: str) -> None:
    """
    Drop all foreign keys on the given table that reference users(id).

    The original migration created unnamed foreign-key constraints,
    so their generated PostgreSQL names cannot safely be hardcoded.
    """

    op.execute(
        sa.text(
            """
            DO $$
            DECLARE
                constraint_name TEXT;
            BEGIN
                FOR constraint_name IN
                    SELECT con.conname
                    FROM pg_constraint con
                    JOIN pg_class rel
                        ON rel.oid = con.conrelid
                    JOIN pg_class ref_rel
                        ON ref_rel.oid = con.confrelid
                    WHERE rel.relname = :table_name
                      AND ref_rel.relname = 'users'
                      AND con.contype = 'f'
                LOOP
                    EXECUTE format(
                        'ALTER TABLE %I DROP CONSTRAINT %I',
                        :table_name,
                        constraint_name
                    );
                END LOOP;
            END
            $$;
            """
        ).bindparams(table_name=table_name)
    )


def upgrade() -> None:

    # ---------------------------------------------------------
    # Make user references nullable
    # ---------------------------------------------------------

    op.alter_column(
        "sites",
        "created_by",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    op.alter_column(
        "species",
        "created_by",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    op.alter_column(
        "species",
        "validated_by",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    op.alter_column(
        "protected_species_list",
        "added_by",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    op.alter_column(
        "site_species",
        "recorded_by",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    op.alter_column(
        "species_validation_history",
        "validated_by",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    op.alter_column(
        "exports",
        "requested_by",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    # ---------------------------------------------------------
    # Remove existing user foreign keys
    # ---------------------------------------------------------

    for table_name in [
        "sites",
        "species",
        "protected_species_list",
        "site_species",
        "species_validation_history",
        "exports",
    ]:
        _drop_user_foreign_keys(table_name)

    # ---------------------------------------------------------
    # Recreate them with ON DELETE SET NULL
    # ---------------------------------------------------------

    op.create_foreign_key(
        "fk_sites_created_by_users",
        "sites",
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_foreign_key(
        "fk_species_created_by_users",
        "species",
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_foreign_key(
        "fk_species_validated_by_users",
        "species",
        "users",
        ["validated_by"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_foreign_key(
        "fk_protected_species_added_by_users",
        "protected_species_list",
        "users",
        ["added_by"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_foreign_key(
        "fk_site_species_recorded_by_users",
        "site_species",
        "users",
        ["recorded_by"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_foreign_key(
        "fk_validation_history_validated_by_users",
        "species_validation_history",
        "users",
        ["validated_by"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_foreign_key(
        "fk_exports_requested_by_users",
        "exports",
        "users",
        ["requested_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:

    # Remove new constraints
    for constraint_name, table_name in [
        ("fk_sites_created_by_users", "sites"),
        ("fk_species_created_by_users", "species"),
        ("fk_species_validated_by_users", "species"),
        ("fk_protected_species_added_by_users", "protected_species_list"),
        ("fk_site_species_recorded_by_users", "site_species"),
        (
            "fk_validation_history_validated_by_users",
            "species_validation_history",
        ),
        ("fk_exports_requested_by_users", "exports"),
    ]:
        op.drop_constraint(
            constraint_name,
            table_name,
            type_="foreignkey",
        )

    # Restore original non-null constraints
    op.alter_column(
        "sites",
        "created_by",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    op.alter_column(
        "species",
        "created_by",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    op.alter_column(
        "species",
        "validated_by",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    op.alter_column(
        "protected_species_list",
        "added_by",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    op.alter_column(
        "site_species",
        "recorded_by",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    op.alter_column(
        "species_validation_history",
        "validated_by",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    op.alter_column(
        "exports",
        "requested_by",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    # Recreate normal foreign keys
    op.create_foreign_key(
        "fk_sites_created_by_users",
        "sites",
        "users",
        ["created_by"],
        ["id"],
    )

    op.create_foreign_key(
        "fk_species_created_by_users",
        "species",
        "users",
        ["created_by"],
        ["id"],
    )

    op.create_foreign_key(
        "fk_species_validated_by_users",
        "species",
        "users",
        ["validated_by"],
        ["id"],
    )

    op.create_foreign_key(
        "fk_protected_species_added_by_users",
        "protected_species_list",
        "users",
        ["added_by"],
        ["id"],
    )

    op.create_foreign_key(
        "fk_site_species_recorded_by_users",
        "site_species",
        "users",
        ["recorded_by"],
        ["id"],
    )

    op.create_foreign_key(
        "fk_validation_history_validated_by_users",
        "species_validation_history",
        "users",
        ["validated_by"],
        ["id"],
    )

    op.create_foreign_key(
        "fk_exports_requested_by_users",
        "exports",
        "users",
        ["requested_by"],
        ["id"],
    )