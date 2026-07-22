from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.job import JobStatus, JobType


class GenerateRequest(BaseModel):
    character_id: uuid.UUID | None = None
    scene_id: str | None = None
    mood_modifier: str | None = None
    custom_prompt: str | None = None
    job_type: JobType
    enhance_prompt: bool = False


class JobResponse(BaseModel):
    id: uuid.UUID
    job_type: JobType
    status: JobStatus
    entry_point: str
    priority: int
    scene_id: str | None
    output_r2_key: str | None = None
    credits_charged: int
    error_message: str | None = None
    attempt_count: int
    created_at: datetime
    queued_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class JobStatusResponse(BaseModel):
    id: uuid.UUID
    status: JobStatus
    output_url: str | None = None
    output_r2_key: str | None = None
    error_message: str | None = None
    progress: float | None = None

    model_config = {"from_attributes": True}
