"""Internal, service-token-only endpoints for trusted sibling apps.

Currently: raw (no-enhancement) I2V generation for invite-maker. Any caller that can
present X-Service-Token gets a literal, unmodified prompt sent straight to the shared
GPU job queue at admin priority — no prompt enhancement, no LoRA auto-attach, no
credit debit, no per-caller rate limiting (the shared queue and single GPU are the
only throttle).
"""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import verify_service_token
from app.i2v_constants import DEFAULT_FPS, DEFAULT_NUM_FRAMES
from app.schemas.job import JobStatusResponse, RawGenerateAcceptedResponse
from app.services.raw_generate_service import RawGenerateService
from app.services.storage_client import StorageClient

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/internal",
    tags=["internal"],
    dependencies=[Depends(verify_service_token)],
)

_MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


@router.post(
    "/raw-generate",
    response_model=RawGenerateAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_raw_generate_job(
    source_image: UploadFile = File(...),
    prompt: str = Form(...),
    negative_prompt: str = Form(""),
    num_frames: int | None = Form(None),
    fps: int | None = Form(None),
    guidance_scale: float | None = Form(None),
    num_inference_steps: int | None = Form(None),
    idempotency_key: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
) -> RawGenerateAcceptedResponse:
    image_bytes = await source_image.read(_MAX_BYTES + 1)
    if len(image_bytes) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"source_image exceeds {settings.MAX_FILE_SIZE_MB} MB limit",
        )

    storage = StorageClient(settings)
    svc = RawGenerateService(db=db, settings=settings, storage=storage)
    job = await svc.create_raw_job(
        source_image=image_bytes,
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_frames=num_frames or DEFAULT_NUM_FRAMES,
        fps=fps or DEFAULT_FPS,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        idempotency_key=idempotency_key,
    )
    await db.commit()
    return RawGenerateAcceptedResponse(job_id=job.id, status=job.status)


@router.get("/raw-generate/{job_id}", response_model=JobStatusResponse)
async def get_raw_generate_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> JobStatusResponse:
    storage = StorageClient(settings)
    svc = RawGenerateService(db=db, settings=settings, storage=storage)
    job = await svc.get_job(job_id)
    output_url = await svc.get_output_url(job)
    return JobStatusResponse(
        id=job.id,
        status=job.status,
        output_url=output_url,
        output_r2_key=job.output_r2_key,
        error_message=job.error_message,
    )
