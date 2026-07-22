from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.job import JobType
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.job import GenerateRequest, JobResponse, JobStatusResponse
from app.services.generate_service import GenerateService
from app.services.llm_client import LLMClient
from app.services.storage_client import StorageClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["generate"])

_MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def _deps() -> tuple[LLMClient, StorageClient]:
    llm = LLMClient(base_url=settings.OLLAMA_URL, model=settings.OLLAMA_MODEL)
    storage = StorageClient(settings)
    return llm, storage


@router.get("/scenes")
async def get_scenes() -> dict:
    from app.services.generate_service import SCENE_CATALOG
    return SCENE_CATALOG


@router.get("/moods")
async def get_moods() -> dict:
    from app.services.generate_service import MOOD_CATALOG
    return MOOD_CATALOG


@router.post("/", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_job(
    job_type: JobType = Form(...),
    character_id: uuid.UUID | None = Form(None),
    scene_id: str | None = Form(None),
    mood_modifier: str | None = Form(None),
    custom_prompt: str | None = Form(None),
    enhance_prompt: bool = Form(False),
    idempotency_key: str | None = Form(None),
    source_image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobResponse:
    source_bytes: bytes | None = None
    if source_image is not None:
        source_bytes = await source_image.read(_MAX_BYTES + 1)
        if len(source_bytes) > _MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Source image exceeds {settings.MAX_FILE_SIZE_MB} MB limit",
            )

    req = GenerateRequest(
        character_id=character_id,
        scene_id=scene_id,
        mood_modifier=mood_modifier,
        custom_prompt=custom_prompt,
        job_type=job_type,
        enhance_prompt=enhance_prompt,
    )

    llm, storage = _deps()
    svc = GenerateService(db=db, settings=settings, llm=llm, storage=storage)
    try:
        job = await svc.create_job(
            current_user.id, req, source_bytes,
            entry_point="website",
            idempotency_key=idempotency_key,
        )
        return JobResponse.model_validate(job)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error creating job for user %s", current_user.id)
        raise


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobStatusResponse:
    _, storage = _deps()
    svc = GenerateService(db=db, settings=settings, llm=LLMClient(base_url=settings.OLLAMA_URL, model=settings.OLLAMA_MODEL), storage=storage)
    try:
        job = await svc.get_job(current_user.id, job_id)
        output_url = await svc.get_output_url(job)
        return JobStatusResponse(
            id=job.id,
            status=job.status,
            output_url=output_url,
            output_r2_key=job.output_r2_key,
            error_message=job.error_message,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching job %s", job_id)
        raise


@router.get("/jobs", response_model=PaginatedResponse[JobResponse])
async def list_jobs(
    character_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[JobResponse]:
    _, storage = _deps()
    svc = GenerateService(db=db, settings=settings, llm=LLMClient(base_url=settings.OLLAMA_URL, model=settings.OLLAMA_MODEL), storage=storage)
    try:
        jobs, total = await svc.list_jobs(current_user.id, character_id, page, per_page)
        return PaginatedResponse(
            items=[JobResponse.model_validate(j) for j in jobs],
            total=total,
            page=page,
            per_page=per_page,
            has_next=(page * per_page) < total,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error listing jobs for user %s", current_user.id)
        raise
