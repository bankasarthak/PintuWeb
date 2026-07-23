from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CreditPackageResponse(BaseModel):
    id: str
    name: str
    credits: int
    price_inr: int
    price_usd: float
    price_crypto: float
    crypto_currency: str
    queue: str
    popular: bool = False
    razorpay_enabled: bool = False
    crypto_enabled: bool = False


class RazorpayCheckoutRequest(BaseModel):
    plan_id: str
    callback_url: str | None = None


class RazorpayCheckoutResponse(BaseModel):
    payment_link_id: str | None
    short_url: str | None
    amount_inr: int
    credits: int
    plan_id: str


class NOWPaymentsCheckoutRequest(BaseModel):
    plan_id: str
    success_url: str | None = None
    cancel_url: str | None = None


class NOWPaymentsCheckoutResponse(BaseModel):
    order_id: str
    invoice_url: str | None
    invoice_id: str | None
    amount: float
    currency: str
    credits: int
    plan_id: str


class PaymentOrderResponse(BaseModel):
    id: UUID
    provider: str
    plan_id: str
    credits: float
    price_amount: float
    price_currency: str
    status: str
    fulfilled_at: datetime | None
    created_at: datetime


class UsageRecordResponse(BaseModel):
    id: UUID
    action: str
    credits_used: float
    created_at: datetime

    @classmethod
    def from_txn(cls, txn: object) -> "UsageRecordResponse":
        amount = float(getattr(txn, "amount"))
        txn_type = str(getattr(txn, "txn_type"))
        if txn_type == "debit":
            credits_used = -abs(amount)
        else:
            credits_used = abs(amount)
        return cls(
            id=getattr(txn, "id"),
            action=str(getattr(txn, "description")),
            credits_used=credits_used,
            created_at=getattr(txn, "created_at"),
        )
