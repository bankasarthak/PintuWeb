"""Public-facing, API-key-only endpoints for external SFW partner services
(e.g. a digital wedding-invitation-video creator) that want to submit their own
photo + free-text prompt and get an animated video back, without going through
PintuWeb's prompt enhancer, LoRA auto-attach, or credit system.

Auth is X-API-Key (PARTNER_API_KEY) — deliberately separate from the
X-Service-Token used by the Telegram bot and invite-maker (see
app/routers/internal.py) so a leaked partner key can't reach bot<->backend
internals. Otherwise this mirrors /internal/raw-generate exactly: same
RawGenerateService, same admin-priority shared GPU queue, same "your prompt is
sent verbatim" contract — just under its own entry_point ("partner") for
isolation/attribution and its own auth dependency.
"""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import verify_partner_api_key
from app.i2v_constants import DEFAULT_FPS, DEFAULT_NUM_FRAMES
from app.schemas.job import JobStatusResponse, RawGenerateAcceptedResponse
from app.services.raw_generate_service import RawGenerateService
from app.services.storage_client import StorageClient

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/partner",
    tags=["partner"],
    dependencies=[Depends(verify_partner_api_key)],
)

_MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024

PARTNER_ENTRY_POINT = "partner"
PARTNER_PRIORITY = 10  # admin tier — same as invite-maker, jumps the shared GPU queue
PARTNER_SERVICE_USER_EMAIL = "partner-api@pintuweb.internal"


def _service(db: AsyncSession) -> RawGenerateService:
    return RawGenerateService(
        db=db,
        settings=settings,
        storage=StorageClient(settings),
        entry_point=PARTNER_ENTRY_POINT,
        service_user_email=PARTNER_SERVICE_USER_EMAIL,
        priority=PARTNER_PRIORITY,
    )


@router.post(
    "/generate",
    response_model=RawGenerateAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_partner_generate_job(
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

    svc = _service(db)
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


@router.get("/generate/{job_id}", response_model=JobStatusResponse)
async def get_partner_generate_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> JobStatusResponse:
    svc = _service(db)
    job = await svc.get_job(job_id)
    output_url = await svc.get_output_url(job)
    return JobStatusResponse(
        id=job.id,
        status=job.status,
        output_url=output_url,
        output_r2_key=job.output_r2_key,
        error_message=job.error_message,
    )
