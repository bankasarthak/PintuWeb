from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JobStatus(str, enum.Enum):
    queued = "queued"
    claimed = "claimed"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"
    timed_out = "timed_out"


class JobType(str, enum.Enum):
    i2i = "i2i"
    i2v = "i2v"
    i2i_custom = "i2i_custom"
    i2v_custom = "i2v_custom"
    random_ai = "random_ai"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    character_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="SET NULL"), nullable=True, index=True)

    job_type: Mapped[JobType] = mapped_column(Enum(JobType, name="jobtype"), nullable=False)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus, name="jobstatus"), nullable=False, default=JobStatus.queued, index=True)
    entry_point: Mapped[str] = mapped_column(String(20), nullable=False, default="website")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=5)

    # Scene / mode / template
    template_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    scene_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mood_modifier: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Prompt audit trail
    user_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)   # kept for compat
    enhanced_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    negative_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Storage — R2 object keys (never local paths in prod)
    input_r2_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    output_r2_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # Legacy local path columns kept so existing rows don't break
    source_image_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    output_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Credits
    credits_charged: Mapped[float] = mapped_column(Numeric(10, 2, asdecimal=False), nullable=False, default=0)

    # Execution
    pod_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    comfyui_prompt_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    lock_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Arbitrary workflow params (loras, seeds, dimensions…)
    job_params: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Idempotency
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)

    # Delivery
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    queued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, server_default=func.now())
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User")  # noqa: F821
    character: Mapped["Character | None"] = relationship("Character")  # noqa: F821
