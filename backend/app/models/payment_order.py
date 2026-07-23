from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # nowpayments | razorpay
    provider: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    plan_id: Mapped[str] = mapped_column(String(40), nullable=False)
    credits: Mapped[float] = mapped_column(Numeric(10, 2, asdecimal=False), nullable=False)
    price_amount: Mapped[float] = mapped_column(Numeric(12, 4, asdecimal=False), nullable=False)
    price_currency: Mapped[str] = mapped_column(String(10), nullable=False)

    # pending | waiting | confirming | finished | failed | expired | partially_paid
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    external_invoice_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    external_payment_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    checkout_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship("User")  # noqa: F821
