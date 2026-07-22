"""Telegram users — no password required.

Revision ID: 004
Revises: 003
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_user_id", sa.BigInteger(), nullable=True))
    op.add_column(
        "users",
        sa.Column("auth_source", sa.String(20), nullable=False, server_default="website"),
    )
    op.create_index("ix_users_telegram_user_id", "users", ["telegram_user_id"], unique=True)
    op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=True)

    op.execute(
        "UPDATE users SET auth_source = 'telegram' "
        "WHERE email LIKE 'tg_%@pintuweb.internal'"
    )
    op.execute(
        "UPDATE users SET telegram_user_id = "
        "CAST(substring(email from 'tg_([0-9]+)@') AS BIGINT) "
        "WHERE email LIKE 'tg_%@pintuweb.internal' "
        "AND telegram_user_id IS NULL"
    )


def downgrade() -> None:
    op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=False)
    op.drop_index("ix_users_telegram_user_id", table_name="users")
    op.drop_column("users", "auth_source")
    op.drop_column("users", "telegram_user_id")
