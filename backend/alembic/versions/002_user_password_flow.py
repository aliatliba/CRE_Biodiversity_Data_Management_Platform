"""Add phone and must_change_password to users

Revision ID: 002
Revises: 001
Create Date: 2026-08-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(length=30), nullable=True))
    op.add_column(
        'users',
        sa.Column(
            'must_change_password',
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    # Admin account created at seed time doesn't need to be forced through
    # the change-password flow.
    op.execute(
        "UPDATE users SET must_change_password = false "
        "WHERE email = 'admin@biodiversity.local'"
    )


def downgrade() -> None:
    op.drop_column('users', 'must_change_password')
    op.drop_column('users', 'phone')
