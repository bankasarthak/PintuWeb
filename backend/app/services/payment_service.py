"""Payment checkout and fulfillment (Razorpay UPI + NOWPayments crypto)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import NotFoundError
from app.models.credit import CreditTransaction
from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.services.credit_packs import CREDIT_PACKS, PACK_BY_ID
from app.services.credit_service import CreditService
from app.services.nowpayments_client import NOWPaymentsClient
from app.services.razorpay_client import RazorpayClient
from app.services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)

TIER_TO_PLAN_ID: dict[str, str] = {
    "free": "free",
    "basic": "starter",
    "starter": "starter",
    "mid": "pro",
    "pro": "elite",
    "elite": "elite",
}


class PaymentService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._razorpay = RazorpayClient()
        self._nowpayments = NOWPaymentsClient()

    @property
    def razorpay_enabled(self) -> bool:
        return self._razorpay.enabled

    @property
    def nowpayments_enabled(self) -> bool:
        return self._nowpayments.enabled

    def list_packages(self) -> list[dict]:
        currency = settings.NOWPAYMENTS_BASE_CURRENCY.lower()
        return [
            {
                "id": p["id"],
                "name": p["label"],
                "credits": p["credits"],
                "price_inr": p["amount_inr"],
                "price_usd": p["amount_usd"],
                "price_crypto": p["amount_usd"],
                "crypto_currency": currency,
                "queue": p["queue"],
                "popular": p["id"] == "mid",
                "razorpay_enabled": self.razorpay_enabled,
                "crypto_enabled": self.nowpayments_enabled,
            }
            for p in CREDIT_PACKS
        ]

    async def create_razorpay_checkout(
        self,
        user: User,
        plan_id: str,
        callback_url: str | None = None,
    ) -> dict:
        plan = PACK_BY_ID.get(plan_id)
        if plan is None:
            raise NotFoundError(f"Unknown plan '{plan_id}'")

        if not self._razorpay.enabled:
            raise RuntimeError("Razorpay is not configured")

        link = await self._razorpay.create_payment_link(
            pintuweb_user_id=str(user.id),
            plan_id=plan["id"],
            credits=plan["credits"],
            amount_paise=plan["amount_paise"],
            description=f"Pintu {plan['label']} — {plan['credits']} credits",
            callback_url=callback_url,
        )
        return {
            "payment_link_id": link.get("id"),
            "short_url": link.get("short_url") or link.get("url"),
            "amount_inr": plan["amount_inr"],
            "credits": plan["credits"],
            "plan_id": plan["id"],
        }

    async def create_nowpayments_checkout(
        self,
        user: User,
        plan_id: str,
        *,
        success_url: str | None = None,
        cancel_url: str | None = None,
    ) -> dict:
        plan = PACK_BY_ID.get(plan_id)
        if plan is None:
            raise NotFoundError(f"Unknown plan '{plan_id}'")

        if not self._nowpayments.enabled:
            raise RuntimeError("NOWPayments is not configured")

        currency = settings.NOWPAYMENTS_BASE_CURRENCY.lower()
        price_amount = float(plan["amount_usd"])

        order = PaymentOrder(
            id=uuid.uuid4(),
            user_id=user.id,
            provider="nowpayments",
            plan_id=plan["id"],
            credits=float(plan["credits"]),
            price_amount=price_amount,
            price_currency=currency,
            status="pending",
        )
        self._db.add(order)
        await self._db.flush()

        frontend = settings.FRONTEND_URL.rstrip("/")
        api_public = settings.API_PUBLIC_URL.rstrip("/")
        success = success_url or f"{frontend}/credits?payment=success&order_id={order.id}"
        cancel = cancel_url or f"{frontend}/credits?payment=cancelled&order_id={order.id}"
        ipn_url = f"{api_public}/credits/webhook/nowpayments"

        invoice = await self._nowpayments.create_invoice(
            price_amount=price_amount,
            price_currency=currency,
            order_id=str(order.id),
            order_description=f"Pintu {plan['label']} — {plan['credits']} credits",
            ipn_callback_url=ipn_url,
            success_url=success,
            cancel_url=cancel,
        )

        invoice_url = invoice.get("invoice_url") or invoice.get("url")
        order.external_invoice_id = str(invoice.get("id") or "")
        order.checkout_url = invoice_url
        order.status = "waiting"
        await self._db.flush()

        return {
            "order_id": str(order.id),
            "invoice_url": invoice_url,
            "invoice_id": order.external_invoice_id,
            "amount": price_amount,
            "currency": currency,
            "credits": plan["credits"],
            "plan_id": plan["id"],
        }

    async def get_payment_order(
        self,
        order_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> PaymentOrder:
        result = await self._db.execute(
            select(PaymentOrder).where(
                PaymentOrder.id == order_id,
                PaymentOrder.user_id == user_id,
            )
        )
        order = result.scalar_one_or_none()
        if order is None:
            raise NotFoundError("Payment order not found")
        return order

    async def handle_nowpayments_ipn(self, payload: dict) -> None:
        order_id_str = payload.get("order_id") or ""
        payment_status = str(payload.get("payment_status") or "").lower()
        payment_id = payload.get("payment_id")

        if not order_id_str:
            logger.warning("NOWPayments IPN: missing order_id")
            return

        try:
            order_id = uuid.UUID(order_id_str)
        except ValueError:
            logger.warning("NOWPayments IPN: invalid order_id %s", order_id_str)
            return

        result = await self._db.execute(
            select(PaymentOrder).where(PaymentOrder.id == order_id).with_for_update()
        )
        order = result.scalar_one_or_none()
        if order is None:
            logger.warning("NOWPayments IPN: order %s not found", order_id)
            return

        order.status = payment_status or order.status
        if payment_id is not None:
            order.external_payment_id = str(payment_id)

        if payment_status != "finished":
            logger.info(
                "NOWPayments IPN: order=%s status=%s (no fulfillment yet)",
                order_id,
                payment_status,
            )
            return

        if order.fulfilled_at is not None:
            logger.info("NOWPayments IPN: order=%s already fulfilled", order_id)
            return

        actually_paid = float(payload.get("actually_paid") or payload.get("pay_amount") or 0)
        expected = float(order.price_amount)
        if actually_paid + 1e-6 < expected * 0.98:
            logger.warning(
                "NOWPayments IPN: underpaid order=%s paid=%s expected=%s",
                order_id,
                actually_paid,
                expected,
            )
            order.status = "partially_paid"
            return

        idempotency_key = f"nowpayments:{payment_id or order.external_invoice_id or order_id}"
        await self._fulfill_purchase(
            user_id=order.user_id,
            credits=order.credits,
            tier=order.plan_id,
            idempotency_key=idempotency_key,
            description=(
                f"Purchase ({order.plan_id}) via crypto — "
                f"{order.price_amount} {order.price_currency.upper()}"
            ),
        )
        order.fulfilled_at = datetime.now(timezone.utc)
        order.status = "finished"
        logger.info(
            "NOWPayments payment fulfilled: order=%s user=%s credits=%s",
            order_id,
            order.user_id,
            order.credits,
        )

    async def fulfill_razorpay_payment(
        self,
        *,
        user_id: uuid.UUID,
        credits: float,
        tier: str,
        idempotency_key: str,
        amount_inr: int | None = None,
    ) -> float:
        return await self._fulfill_purchase(
            user_id=user_id,
            credits=credits,
            tier=tier,
            idempotency_key=idempotency_key,
            description=f"Purchase ({tier}) via Razorpay"
            + (f" — ₹{amount_inr}" if amount_inr else ""),
        )

    async def _fulfill_purchase(
        self,
        *,
        user_id: uuid.UUID,
        credits: float,
        tier: str,
        idempotency_key: str,
        description: str,
    ) -> float:
        credits_svc = CreditService(self._db)
        await credits_svc.grant(
            user_id=user_id,
            amount=credits,
            description=description,
            idempotency_key=idempotency_key,
        )
        sub_svc = SubscriptionService(self._db)
        await sub_svc.upgrade_plan_if_higher(
            user_id, TIER_TO_PLAN_ID.get(tier.lower(), "free")
        )
        return await credits_svc.balance(user_id)

    async def list_usage(
        self,
        user_id: uuid.UUID,
        *,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[CreditTransaction], int]:
        offset = (page - 1) * per_page
        base = select(CreditTransaction).where(CreditTransaction.user_id == user_id)

        count_result = await self._db.execute(
            select(func.count(CreditTransaction.id)).where(
                CreditTransaction.user_id == user_id
            )
        )
        total = int(count_result.scalar_one())

        result = await self._db.execute(
            base.order_by(CreditTransaction.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        return list(result.scalars()), total
