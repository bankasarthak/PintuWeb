# Fractional credits for chat and per-use pricing
# Revision ID: 003
# Revises: 002
# Create Date: 2026-07-22

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert integer credit columns to NUMERIC(10,2) so we can charge e.g. 0.2 per chat.
    op.execute("ALTER TABLE users ALTER COLUMN credits TYPE NUMERIC(10,2) USING credits::NUMERIC(10,2)")
    op.execute("ALTER TABLE credit_transactions ALTER COLUMN amount TYPE NUMERIC(10,2) USING amount::NUMERIC(10,2)")
    op.execute("ALTER TABLE credit_transactions ALTER COLUMN balance_after TYPE NUMERIC(10,2) USING balance_after::NUMERIC(10,2)")
    op.execute("ALTER TABLE jobs ALTER COLUMN credits_charged TYPE NUMERIC(10,2) USING credits_charged::NUMERIC(10,2)")
    op.execute("ALTER TABLE subscription_plans ALTER COLUMN credits_per_month TYPE NUMERIC(10,2) USING credits_per_month::NUMERIC(10,2)")


def downgrade() -> None:
    op.execute("ALTER TABLE subscription_plans ALTER COLUMN credits_per_month TYPE INTEGER USING credits_per_month::INTEGER")
    op.execute("ALTER TABLE jobs ALTER COLUMN credits_charged TYPE INTEGER USING credits_charged::INTEGER")
    op.execute("ALTER TABLE credit_transactions ALTER COLUMN balance_after TYPE INTEGER USING balance_after::INTEGER")
    op.execute("ALTER TABLE credit_transactions ALTER COLUMN amount TYPE INTEGER USING amount::INTEGER")
    op.execute("ALTER TABLE users ALTER COLUMN credits TYPE INTEGER USING credits::INTEGER")
