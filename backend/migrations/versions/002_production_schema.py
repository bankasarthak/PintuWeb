# Production schema upgrade
# Revision ID: 002
# Revises: 001
# Create Date: 2026-07-21

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Drop old enums and recreate with expanded values ─────────────────────
    # We rename the old enums, recreate, migrate data, then drop old ones.
    op.execute("ALTER TYPE jobstatus RENAME TO jobstatus_old")
    op.execute(
        "CREATE TYPE jobstatus AS ENUM ("
        "'queued','claimed','processing','completed','failed','cancelled','timed_out'"
        ")"
    )
    # Must drop default before changing type, then restore it
    op.execute("ALTER TABLE jobs ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "ALTER TABLE jobs ALTER COLUMN status TYPE jobstatus "
        "USING status::text::jobstatus"
    )
    op.execute("ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'queued'::jobstatus")
    op.execute("DROP TYPE jobstatus_old")

    op.execute("ALTER TYPE jobtype RENAME TO jobtype_old")
    op.execute(
        "CREATE TYPE jobtype AS ENUM ("
        "'i2i','i2v','i2i_custom','i2v_custom','random_ai'"
        ")"
    )
    op.execute(
        "ALTER TABLE jobs ALTER COLUMN job_type TYPE jobtype "
        "USING job_type::text::jobtype"
    )
    op.execute("DROP TYPE jobtype_old")

    # ── subscription_plans ────────────────────────────────────────────────────
    # Tables may already exist from a previous partial run — use IF NOT EXISTS guard
    op.execute("""
        CREATE TABLE IF NOT EXISTS subscription_plans (
            id VARCHAR(40) PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            price_inr INTEGER NOT NULL DEFAULT 0,
            credits_per_month INTEGER NOT NULL DEFAULT 0,
            max_characters INTEGER NOT NULL DEFAULT 1,
            output_storage_days INTEGER NOT NULL DEFAULT 30,
            priority INTEGER NOT NULL DEFAULT 5,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # Seed default plans (idempotent)
    op.execute(
        "INSERT INTO subscription_plans "
        "(id, name, price_inr, credits_per_month, max_characters, output_storage_days, priority, is_active) VALUES "
        "('free',    'Free',    0,    10,  1, 7,  5, true),"
        "('starter', 'Starter', 199,  50,  2, 30, 6, true),"
        "('pro',     'Pro',     499, 150,  5, 90, 7, true),"
        "('elite',   'Elite',   999, 500, 10, 365, 9, true) "
        "ON CONFLICT (id) DO NOTHING"
    )

    # ── user_subscriptions ────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plan_id VARCHAR(40) NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
            current_period_end TIMESTAMPTZ,
            cancelled_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_user_subscriptions_user_id ON user_subscriptions(user_id)"
    )

    # Give all existing users a free subscription (skip if already has one)
    op.execute(
        "INSERT INTO user_subscriptions (id, user_id, plan_id, status) "
        "SELECT gen_random_uuid(), u.id, 'free', 'active' FROM users u "
        "WHERE NOT EXISTS ("
        "  SELECT 1 FROM user_subscriptions us WHERE us.user_id = u.id"
        ")"
    )

    # ── jobs: new columns ─────────────────────────────────────────────────────
    op.add_column("jobs", sa.Column("entry_point", sa.String(20), nullable=False, server_default="website"))
    op.add_column("jobs", sa.Column("priority", sa.Integer(), nullable=False, server_default="5"))
    op.add_column("jobs", sa.Column("user_prompt", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("negative_prompt", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("final_prompt", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("input_r2_key", sa.String(512), nullable=True))
    op.add_column("jobs", sa.Column("output_r2_key", sa.String(512), nullable=True))
    op.add_column("jobs", sa.Column("pod_id", sa.String(80), nullable=True))
    op.add_column("jobs", sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("jobs", sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"))
    op.add_column("jobs", sa.Column("lock_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("jobs", sa.Column("idempotency_key", sa.String(128), nullable=True))
    op.add_column("jobs", sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("jobs", sa.Column("delivery_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("jobs", sa.Column("queued_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()))
    op.add_column("jobs", sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("jobs", sa.Column("processing_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("jobs", sa.Column("job_params", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'")))

    op.create_index("ix_jobs_idempotency_key", "jobs", ["idempotency_key"], unique=True, postgresql_where=sa.text("idempotency_key IS NOT NULL"))
    op.create_index("ix_jobs_status_priority", "jobs", ["status", "priority", "queued_at"])

    # ── credit_transactions: new columns ──────────────────────────────────────
    op.add_column("credit_transactions", sa.Column(
        "txn_type",
        sa.String(20),
        nullable=False,
        server_default="debit",
        comment="debit | credit | refund | grant",
    ))
    op.add_column("credit_transactions", sa.Column("balance_after", sa.Integer(), nullable=True))
    op.add_column("credit_transactions", sa.Column("idempotency_key", sa.String(128), nullable=True))
    op.create_index(
        "ix_credit_txn_idempotency",
        "credit_transactions",
        ["idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )

    # ── users: add subscription_plan_id for quick denormalised lookup ─────────
    op.add_column("users", sa.Column("plan_id", sa.String(40), nullable=False, server_default="free"))


def downgrade() -> None:
    op.drop_column("users", "plan_id")

    op.drop_index("ix_credit_txn_idempotency", "credit_transactions")
    op.drop_column("credit_transactions", "idempotency_key")
    op.drop_column("credit_transactions", "balance_after")
    op.drop_column("credit_transactions", "txn_type")

    op.drop_index("ix_jobs_status_priority", "jobs")
    op.drop_index("ix_jobs_idempotency_key", "jobs")
    for col in [
        "job_params", "processing_at", "claimed_at", "queued_at", "delivery_attempts",
        "delivered_at", "lock_expires_at", "max_attempts", "attempt_count", "pod_id",
        "output_r2_key", "input_r2_key", "final_prompt", "negative_prompt", "user_prompt",
        "priority", "entry_point", "idempotency_key",
    ]:
        op.drop_column("jobs", col)

    op.drop_index("ix_user_subscriptions_user_id", "user_subscriptions")
    op.drop_table("user_subscriptions")
    op.drop_table("subscription_plans")

    # Restore original enums
    op.execute("ALTER TYPE jobstatus RENAME TO jobstatus_new")
    op.execute("CREATE TYPE jobstatus AS ENUM ('queued','processing','completed','failed')")
    op.execute("ALTER TABLE jobs ALTER COLUMN status TYPE jobstatus USING status::text::jobstatus")
    op.execute("DROP TYPE jobstatus_new")

    op.execute("ALTER TYPE jobtype RENAME TO jobtype_new")
    op.execute("CREATE TYPE jobtype AS ENUM ('i2i','i2v','i2i_custom','i2v_custom','random_ai')")
    op.execute("ALTER TABLE jobs ALTER COLUMN job_type TYPE jobtype USING job_type::text::jobtype")
    op.execute("DROP TYPE jobtype_new")
