"""Auth hardening: token versioning, login lockout, persistent refresh tokens

- users.token_version: embedded in access tokens; bumped on password change so
  existing sessions stop working
- users.failed_login_attempts / users.locked_until: per-account lockout
- refresh_tokens: rotation + revocation that survive restarts
- the seeded admin still using the published default password must change it

Revision ID: 006
Revises: 005
Create Date: 2026-10-24
"""
from typing import Sequence, Union

import bcrypt
import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_ADMIN_EMAIL = "admin@biodiversity.local"
DEFAULT_ADMIN_PASSWORD = b"admin123"


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "users",
        sa.Column(
            "failed_login_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
    )
    op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("jti", sa.String(length=64), nullable=False),
        sa.Column("family_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("jti"),
    )
    op.create_index("ix_refresh_tokens_family_id", "refresh_tokens", ["family_id"])
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_expires_at", "refresh_tokens", ["expires_at"])

    # Migration 002 exempted the seeded admin from the first-login password change,
    # and its password is published in the README. Force the change if it is unchanged.
    conn = op.get_bind()
    row = conn.execute(
        sa.text("SELECT id, hashed_password FROM users WHERE email = :email"),
        {"email": DEFAULT_ADMIN_EMAIL},
    ).first()
    if row is not None:
        try:
            still_default = bcrypt.checkpw(DEFAULT_ADMIN_PASSWORD, row.hashed_password.encode())
        except ValueError:
            still_default = False
        if still_default:
            conn.execute(
                sa.text("UPDATE users SET must_change_password = true WHERE id = :id"),
                {"id": row.id},
            )


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_expires_at", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_family_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")
    op.drop_column("users", "token_version")
