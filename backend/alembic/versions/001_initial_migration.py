"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create extensions first
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS citext"))

    op.create_table('roles',
        sa.Column('id', sa.SmallInteger(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_table('users',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('email', postgresql.CITEXT(), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('role_id', sa.SmallInteger(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_role_id'), 'users', ['role_id'], unique=False)
    op.create_table('sites',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index('ix_sites_name_trgm', 'sites', ['name'], unique=False, postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'})
    op.create_table('species',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('scientific_name', postgresql.CITEXT(), nullable=False),
        sa.Column('kingdom', sa.String(length=100), nullable=True),
        sa.Column('class_name', sa.String(length=100), nullable=True),
        sa.Column('order_name', sa.String(length=100), nullable=True),
        sa.Column('family', sa.String(length=100), nullable=True),
        sa.Column('genus', sa.String(length=100), nullable=True),
        sa.Column('species_epithet', sa.String(length=100), nullable=True),
        sa.Column('common_name', sa.String(length=255), nullable=True),
        sa.Column('raw_taxonomy_extra', postgresql.JSONB(), nullable=True),
        sa.Column('field_sources', postgresql.JSONB(), nullable=True),
        sa.Column('iucn_status', sa.String(length=50), nullable=True),
        sa.Column('iucn_trend', sa.String(length=50), nullable=True),
        sa.Column('national_status', sa.String(length=50), nullable=False),
        sa.Column('guild', sa.String(length=255), nullable=True),
        sa.Column('ecosystem_service', sa.Text(), nullable=True),
        sa.Column('habitat', sa.Text(), nullable=True),
        sa.Column('typology', sa.String(length=255), nullable=True),
        sa.Column('endemism', sa.String(length=255), nullable=True),
        sa.Column('potential_threats', sa.Text(), nullable=True),
        sa.Column('reference', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_by', sa.BigInteger(), nullable=False),
        sa.Column('validated_by', sa.BigInteger(), nullable=True),
        sa.Column('validated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('draft', 'validated')", name='ck_species_status'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['validated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('scientific_name')
    )
    op.create_index('ix_species_family_genus', 'species', ['family', 'genus'], unique=False)
    op.create_index('ix_species_status', 'species', ['status'], unique=False)
    op.create_table('protected_species_list',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('scientific_name', postgresql.CITEXT(), nullable=False),
        sa.Column('source_reference', sa.Text(), nullable=True),
        sa.Column('added_by', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['added_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('scientific_name')
    )
    op.create_table('site_species',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('site_id', sa.BigInteger(), nullable=False),
        sa.Column('species_id', sa.BigInteger(), nullable=False),
        sa.Column('recorded_by', sa.BigInteger(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
        sa.ForeignKeyConstraint(['species_id'], ['species.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('site_id', 'species_id', name='uq_site_species')
    )
    op.create_index('ix_site_species_site_id', 'site_species', ['site_id'], unique=False)
    op.create_index('ix_site_species_species_id', 'site_species', ['species_id'], unique=False)
    op.create_table('species_validation_history',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('species_id', sa.BigInteger(), nullable=False),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('changed_fields', postgresql.JSONB(), nullable=False),
        sa.Column('validated_by', sa.BigInteger(), nullable=False),
        sa.Column('validated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['species_id'], ['species.id'], ),
        sa.ForeignKeyConstraint(['validated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_validation_history_species_id', 'species_validation_history', ['species_id'], unique=False)
    op.create_index('ix_validation_history_validated_at', 'species_validation_history', ['validated_at'], unique=False)
    op.create_table('exports',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('requested_by', sa.BigInteger(), nullable=False),
        sa.Column('format', sa.String(length=10), nullable=False),
        sa.Column('filters', postgresql.JSONB(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_exports_requested_by', 'exports', ['requested_by'], unique=False)
    op.create_index('ix_exports_status', 'exports', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_exports_status', table_name='exports')
    op.drop_index('ix_exports_requested_by', table_name='exports')
    op.drop_table('exports')
    op.drop_index('ix_validation_history_validated_at', table_name='species_validation_history')
    op.drop_index('ix_validation_history_species_id', table_name='species_validation_history')
    op.drop_table('species_validation_history')
    op.drop_index('ix_site_species_species_id', table_name='site_species')
    op.drop_index('ix_site_species_site_id', table_name='site_species')
    op.drop_table('site_species')
    op.drop_table('protected_species_list')
    op.drop_index('ix_species_status', table_name='species')
    op.drop_index('ix_species_family_genus', table_name='species')
    op.drop_table('species')
    op.drop_index('ix_sites_name_trgm', table_name='sites')
    op.drop_table('sites')
    op.drop_index(op.f('ix_users_role_id'), table_name='users')
    op.drop_table('users')
    op.drop_table('roles')
