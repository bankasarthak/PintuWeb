"""Public I2I "Photo" gallery entries.

Each row is a showcase prompt + up to three "helpers" (LoRAs — never called that
in user-facing copy, see bot/templates/helper_catalog.py) with a pre-generated
showcase image. Owned/served by the Telegram bot's shared-Postgres access
layer (bot/services/photo_gallery_service.py) the same way jobs/credits are —
this SQLAlchemy model exists for schema management (Alembic) and any future
PintuWeb-side admin tooling, not as a second write path.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PhotoGalleryEntry(Base):
    __tablename__ = "photo_gallery_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    negative_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)

    helper_high: Mapped[str | None] = mapped_column(String(200), nullable=True)
    helper_high_strength: Mapped[float] = mapped_column(Float, nullable=False, default=0.9)
    helper_low: Mapped[str | None] = mapped_column(String(200), nullable=True)
    helper_low_strength: Mapped[float] = mapped_column(Float, nullable=False, default=0.9)
    helper_third: Mapped[str | None] = mapped_column(String(200), nullable=True)
    helper_third_strength: Mapped[float] = mapped_column(Float, nullable=False, default=0.9)

    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    reference_face_r2_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    showcase_r2_key: Mapped[str | None] = mapped_column(String(512), nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    generation_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
