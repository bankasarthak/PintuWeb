"""
SubscriptionService — plan lookups and monthly credit grants.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.subscription import SubscriptionPlan, UserSubscription
from app.models.user import User
from app.services.credit_service import CreditService

logger = logging.getLogger(__name__)


class SubscriptionService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_active_plan(self, user_id: uuid.UUID) -> SubscriptionPlan:
        """Return the user's current active plan (falls back to 'free')."""
        result = await self._db.execute(
            select(UserSubscription)
            .where(
                UserSubscription.user_id == user_id,
                UserSubscription.status == "active",
            )
            .order_by(UserSubscription.created_at.desc())
            .limit(1)
        )
        sub = result.scalar_one_or_none()
        plan_id = sub.plan_id if sub else "free"

        plan_result = await self._db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id)
        )
        plan = plan_result.scalar_one_or_none()
        if plan is None:
            raise NotFoundError(f"Plan '{plan_id}' not found")
        return plan

    async def grant_monthly_credits(self, user_id: uuid.UUID) -> float:
        """
        Grant the user their monthly credit allowance.
        Idempotent — keyed on the current month so it's safe to call multiple times.
        Returns the number of credits granted (0 if already granted this month).
        """
        plan = await self.get_active_plan(user_id)
        if plan.credits_per_month <= 0:
            return 0.0

        now = datetime.now(timezone.utc)
        idem_key = f"monthly_grant:{user_id}:{now.year}:{now.month}"

        credits_svc = CreditService(self._db)
        txn = await credits_svc.grant(
            user_id=user_id,
            amount=plan.credits_per_month,
            description=f"Monthly grant — {plan.name} plan ({now.strftime('%Y-%m')})",
            idempotency_key=idem_key,
        )
        # If idempotency_key already existed, txn.amount matches existing row
        return txn.amount if txn.amount > 0 else 0.0

    async def upgrade_plan_if_higher(self, user_id: uuid.UUID, new_plan_id: str) -> None:
        """Upgrade subscription only when new_plan_id outranks the current plan."""
        if new_plan_id == "free":
            return

        priority = {"free": 0, "starter": 1, "pro": 2, "elite": 3}
        user_result = await self._db.execute(
            select(User).where(User.id == user_id).with_for_update()
        )
        user = user_result.scalar_one_or_none()
        if user is None:
            raise NotFoundError("User not found")

        current = str(user.plan_id or "free")
        if priority.get(new_plan_id, 0) <= priority.get(current, 0):
            return

        await self.upgrade_plan(user_id, new_plan_id)

    async def upgrade_plan(
        self,
        user_id: uuid.UUID,
        new_plan_id: str,
    ) -> UserSubscription:
        """Cancel current subscription and create a new one."""
        # Verify plan exists
        plan_result = await self._db.execute(
            select(SubscriptionPlan).where(
                SubscriptionPlan.id == new_plan_id,
                SubscriptionPlan.is_active.is_(True),
            )
        )
        plan = plan_result.scalar_one_or_none()
        if plan is None:
            raise NotFoundError(f"Plan '{new_plan_id}' not found or inactive")

        # Cancel existing subscriptions
        existing_result = await self._db.execute(
            select(UserSubscription).where(
                UserSubscription.user_id == user_id,
                UserSubscription.status == "active",
            )
        )
        for existing in existing_result.scalars():
            existing.status = "cancelled"
            existing.cancelled_at = datetime.now(timezone.utc)

        # Create new subscription
        sub = UserSubscription(
            id=uuid.uuid4(),
            user_id=user_id,
            plan_id=new_plan_id,
            status="active",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
        )
        self._db.add(sub)

        # Update denormalised plan_id on user for fast lookups
        user_result = await self._db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.plan_id = new_plan_id

        await self._db.flush()
        logger.info("User %s upgraded to plan %s", user_id, new_plan_id)
        return sub

    async def list_plans(self) -> list[SubscriptionPlan]:
        result = await self._db.execute(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active.is_(True))
            .order_by(SubscriptionPlan.price_inr)
        )
        return list(result.scalars())
