"""Rename subscription_plans ids to match the actual purchasable tiers.

Renames the free/starter/pro/elite naming (which only ever lived in this
internal table, unrelated to the real payment tiers) to free/basic/mid/pro,
matching bot/handlers/generate.py CREDIT_PACKS and
bot/services/razorpay_client.py RAZORPAY_PLANS in PintuV3 1:1. The old
naming caused real confusion: buying the top-tier "Pro Plan" (Rs.750/300
credits) upgraded plan_id to 'elite', while 'pro' was actually the mid-tier
(Rs.300/100 credits) target.

Also applied idempotently by PintuV3/migrations/015_rename_subscription_plans.sql
(the bot applies its migrations automatically on every restart) against the
same shared Postgres DB. Whichever one runs first wins; both are idempotent
via the same CASE-based rename + schema_migrations/alembic_version guards.

Revision ID: 008
Revises: 007
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_RENAME_CASE = "CASE {col} WHEN 'starter' THEN 'basic' WHEN 'pro' THEN 'mid' WHEN 'elite' THEN 'pro' ELSE {col} END"


def upgrade() -> None:
    op.execute("ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey")

    op.execute(
        f"""
        UPDATE subscription_plans SET
            id = {_RENAME_CASE.format(col="id")},
            name = CASE id WHEN 'free' THEN 'Free' WHEN 'starter' THEN 'Basic' WHEN 'pro' THEN 'Mid' WHEN 'elite' THEN 'Pro' ELSE name END,
            price_inr = CASE id WHEN 'starter' THEN 75 WHEN 'pro' THEN 300 WHEN 'elite' THEN 750 ELSE price_inr END,
            credits_per_month = CASE id WHEN 'free' THEN 5 WHEN 'starter' THEN 20 WHEN 'pro' THEN 100 WHEN 'elite' THEN 300 ELSE credits_per_month END
        WHERE id IN ('free', 'starter', 'pro', 'elite')
        """
    )
    op.execute(
        f"UPDATE user_subscriptions SET plan_id = {_RENAME_CASE.format(col='plan_id')} "
        "WHERE plan_id IN ('starter', 'pro', 'elite')"
    )
    op.execute(
        f"UPDATE users SET plan_id = {_RENAME_CASE.format(col='plan_id')} "
        "WHERE plan_id IN ('starter', 'pro', 'elite')"
    )

    op.execute(
        "ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_plan_id_fkey "
        "FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT"
    )


def downgrade() -> None:
    # Not reversible in a lossless way (original starter/pro/elite pricing
    # metadata isn't preserved anywhere) — intentionally a no-op.
    pass
