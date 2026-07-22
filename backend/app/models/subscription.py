from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    price_inr: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    credits_per_month: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    max_characters: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    output_storage_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    # Higher = better queue priority
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    subscriptions: Mapped[list["UserSubscription"]] = relationship("UserSubscription", back_populates="plan")


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[str] = mapped_column(String(40), ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False)
    # active | cancelled | expired
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="subscription")  # noqa: F821
    plan: Mapped["SubscriptionPlan"] = relationship("SubscriptionPlan", back_populates="subscriptions")
