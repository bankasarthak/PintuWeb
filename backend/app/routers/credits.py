from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.credits import (
    CreditPackageResponse,
    NOWPaymentsCheckoutRequest,
    NOWPaymentsCheckoutResponse,
    PaymentOrderResponse,
    RazorpayCheckoutRequest,
    RazorpayCheckoutResponse,
    UsageRecordResponse,
)
from app.services.nowpayments_client import NOWPaymentsClient
from app.services.payment_service import PaymentService
from app.services.razorpay_client import RazorpayClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/packages", response_model=list[CreditPackageResponse])
async def list_packages(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CreditPackageResponse]:
    _ = current_user
    svc = PaymentService(db)
    return [CreditPackageResponse(**p) for p in svc.list_packages()]


@router.post("/checkout/razorpay", response_model=RazorpayCheckoutResponse)
async def razorpay_checkout(
    req: RazorpayCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RazorpayCheckoutResponse:
    svc = PaymentService(db)
    if not svc.razorpay_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="UPI payments are not configured yet",
        )

    callback_url = req.callback_url
    if not callback_url:
        callback_url = f"{settings.FRONTEND_URL.rstrip('/')}/credits?payment=success"

    try:
        result = await svc.create_razorpay_checkout(
            current_user,
            req.plan_id,
            callback_url=callback_url,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return RazorpayCheckoutResponse(**result)


@router.post("/checkout/nowpayments", response_model=NOWPaymentsCheckoutResponse)
async def nowpayments_checkout(
    req: NOWPaymentsCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NOWPaymentsCheckoutResponse:
    svc = PaymentService(db)
    if not svc.nowpayments_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Crypto payments are not configured yet",
        )

    try:
        result = await svc.create_nowpayments_checkout(
            current_user,
            req.plan_id,
            success_url=req.success_url,
            cancel_url=req.cancel_url,
        )
        await db.commit()
    except NotFoundError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RuntimeError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return NOWPaymentsCheckoutResponse(**result)


@router.get("/orders/{order_id}", response_model=PaymentOrderResponse)
async def get_payment_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentOrderResponse:
    svc = PaymentService(db)
    try:
        order = await svc.get_payment_order(order_id, current_user.id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return PaymentOrderResponse(
        id=order.id,
        provider=order.provider,
        plan_id=order.plan_id,
        credits=float(order.credits),
        price_amount=float(order.price_amount),
        price_currency=order.price_currency,
        status=order.status,
        fulfilled_at=order.fulfilled_at,
        created_at=order.created_at,
    )


@router.get("/usage", response_model=PaginatedResponse[UsageRecordResponse])
async def list_usage(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[UsageRecordResponse]:
    svc = PaymentService(db)
    items, total = await svc.list_usage(current_user.id, page=page, per_page=per_page)
    return PaginatedResponse(
        items=[UsageRecordResponse.from_txn(t) for t in items],
        total=total,
        page=page,
        per_page=per_page,
        has_next=(page * per_page) < total,
    )


@router.post("/webhook/razorpay", include_in_schema=False)
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Razorpay webhook for payment_link.paid events.
    Credits users by pintuweb_user_id in payment link notes.
    """
    client = RazorpayClient()
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if settings.RAZORPAY_WEBHOOK_SECRET:
        if not client.verify_webhook_signature(body, signature):
            logger.warning("Razorpay webhook: invalid signature")
            raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        event = json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Bad JSON") from exc

    event_type = event.get("event", "")
    logger.info("Razorpay webhook event: %s", event_type)

    if event_type != "payment_link.paid":
        return {"status": "ok"}

    payload = event.get("payload", {})
    payment_entity = payload.get("payment_link", {}).get("entity")
    if not payment_entity:
        logger.warning("Razorpay webhook: no payment_link entity")
        return {"status": "ok"}

    notes = payment_entity.get("notes") or {}
    if not notes:
        payment_sub = payload.get("payment", {}).get("entity", {})
        notes = payment_sub.get("notes") or {}

    user_id_str = notes.get("pintuweb_user_id", "")
    plan_id = notes.get("plan_id", "basic")
    credits_str = notes.get("credits", "0")

    if not user_id_str:
        logger.warning("Razorpay webhook: missing pintuweb_user_id in notes")
        return {"status": "ok"}

    try:
        user_id = uuid.UUID(user_id_str)
        credits = float(credits_str)
    except (ValueError, TypeError):
        logger.warning("Razorpay webhook: invalid user_id or credits in notes")
        return {"status": "ok"}

    payment_link_id = payment_entity.get("id") or "unknown"
    idempotency_key = f"razorpay:{payment_link_id}"
    amount_inr = int(payment_entity.get("amount", 0)) // 100

    svc = PaymentService(db)
    try:
        balance = await svc.fulfill_razorpay_payment(
            user_id=user_id,
            credits=credits,
            tier=plan_id,
            idempotency_key=idempotency_key,
            amount_inr=amount_inr,
        )
        await db.commit()
        logger.info(
            "Razorpay payment fulfilled: user=%s plan=%s credits=%s balance=%s",
            user_id,
            plan_id,
            credits,
            balance,
        )
    except NotFoundError:
        await db.rollback()
        logger.warning("Razorpay webhook: user %s not found", user_id)
    except Exception:
        await db.rollback()
        logger.exception("Razorpay webhook fulfillment failed")
        raise HTTPException(status_code=500, detail="Fulfillment failed") from None

    return {"status": "ok"}


@router.post("/webhook/nowpayments", include_in_schema=False)
async def nowpayments_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """NOWPayments IPN callback — credits user when payment_status is finished."""
    client = NOWPaymentsClient()
    raw = await request.body()
    signature = request.headers.get("x-nowpayments-sig", "")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Bad JSON") from exc

    if settings.NOWPAYMENTS_IPN_SECRET:
        if not client.verify_ipn_signature(payload, signature):
            logger.warning("NOWPayments IPN: invalid signature")
            raise HTTPException(status_code=400, detail="Invalid signature")

    payment_status = payload.get("payment_status", "")
    logger.info(
        "NOWPayments IPN: order=%s status=%s payment_id=%s",
        payload.get("order_id"),
        payment_status,
        payload.get("payment_id"),
    )

    svc = PaymentService(db)
    try:
        await svc.handle_nowpayments_ipn(payload)
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("NOWPayments IPN processing failed")
        raise HTTPException(status_code=500, detail="Processing failed") from None

    return {"status": "ok"}
