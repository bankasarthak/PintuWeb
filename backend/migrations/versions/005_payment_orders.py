"""Payment orders for async crypto/UPI checkout tracking.

Revision ID: 005
Revises: 004
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payment_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("plan_id", sa.String(40), nullable=False),
        sa.Column("credits", sa.Numeric(10, 2), nullable=False),
        sa.Column("price_amount", sa.Numeric(12, 4), nullable=False),
        sa.Column("price_currency", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("external_invoice_id", sa.String(64), nullable=True),
        sa.Column("external_payment_id", sa.String(64), nullable=True),
        sa.Column("checkout_url", sa.String(512), nullable=True),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payment_orders_user_id", "payment_orders", ["user_id"])
    op.create_index("ix_payment_orders_provider", "payment_orders", ["provider"])
    op.create_index("ix_payment_orders_status", "payment_orders", ["status"])
    op.create_index("ix_payment_orders_external_invoice_id", "payment_orders", ["external_invoice_id"])
    op.create_index("ix_payment_orders_external_payment_id", "payment_orders", ["external_payment_id"])


def downgrade() -> None:
    op.drop_table("payment_orders")
