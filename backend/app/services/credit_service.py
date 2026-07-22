"""
Atomic credit operations using SELECT FOR UPDATE row-level locking.

All public methods must be called inside an open AsyncSession transaction.
The caller is responsible for commit/rollback.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.credit import CreditTransaction
from app.models.user import User

logger = logging.getLogger(__name__)


class CreditService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def debit(
        self,
        user_id: uuid.UUID,
        amount: float,
        description: str,
        job_id: uuid.UUID | None = None,
        idempotency_key: str | None = None,
    ) -> CreditTransaction:
        """
        Atomically deduct `amount` credits from the user.

        Raises ConflictError if credits are insufficient.
        Raises ConflictError if the idempotency_key was already used (duplicate).
        """
        if idempotency_key:
            existing = await self._find_by_idempotency(idempotency_key)
            if existing:
                return existing

        user = await self._lock_user(user_id)

        if user.credits < amount:
            raise ConflictError(
                f"Insufficient credits: need {amount}, have {user.credits}"
            )

        user.credits -= amount

        txn = CreditTransaction(
            id=uuid.uuid4(),
            user_id=user_id,
            amount=-amount,
            txn_type="debit",
            balance_after=user.credits,
            description=description,
            job_id=job_id,
            idempotency_key=idempotency_key,
        )
        self._db.add(txn)
        await self._db.flush()
        return txn

    async def refund(
        self,
        user_id: uuid.UUID,
        amount: float,
        description: str,
        job_id: uuid.UUID | None = None,
        idempotency_key: str | None = None,
    ) -> CreditTransaction:
        """Refund `amount` credits to the user (idempotent)."""
        if idempotency_key:
            existing = await self._find_by_idempotency(idempotency_key)
            if existing:
                return existing

        user = await self._lock_user(user_id)
        user.credits += amount

        txn = CreditTransaction(
            id=uuid.uuid4(),
            user_id=user_id,
            amount=amount,
            txn_type="refund",
            balance_after=user.credits,
            description=description,
            job_id=job_id,
            idempotency_key=idempotency_key,
        )
        self._db.add(txn)
        await self._db.flush()
        return txn

    async def grant(
        self,
        user_id: uuid.UUID,
        amount: float,
        description: str,
        idempotency_key: str | None = None,
    ) -> CreditTransaction:
        """Grant credits (subscription top-up, bonus, admin override)."""
        if idempotency_key:
            existing = await self._find_by_idempotency(idempotency_key)
            if existing:
                return existing

        user = await self._lock_user(user_id)
        user.credits += amount

        txn = CreditTransaction(
            id=uuid.uuid4(),
            user_id=user_id,
            amount=amount,
            txn_type="grant",
            balance_after=user.credits,
            description=description,
            idempotency_key=idempotency_key,
        )
        self._db.add(txn)
        await self._db.flush()
        return txn

    async def balance(self, user_id: uuid.UUID) -> float:
        result = await self._db.execute(
            select(User.credits).where(User.id == user_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise NotFoundError("User not found")
        return row

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _lock_user(self, user_id: uuid.UUID) -> User:
        """Fetch the user row with a write lock to prevent races."""
        result = await self._db.execute(
            select(User).where(User.id == user_id).with_for_update()
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise NotFoundError("User not found")
        return user

    async def _find_by_idempotency(self, key: str) -> CreditTransaction | None:
        result = await self._db.execute(
            select(CreditTransaction).where(CreditTransaction.idempotency_key == key)
        )
        return result.scalar_one_or_none()
