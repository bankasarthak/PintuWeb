from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.job import Job, JobStatus, JobType
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.job import JobResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/gallery", tags=["gallery"])


@router.get("/", response_model=PaginatedResponse[JobResponse])
async def list_gallery(
    character_id: uuid.UUID | None = Query(None),
    job_type: JobType | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[JobResponse]:
    offset = (page - 1) * per_page
    try:
        base_filter = [
            Job.user_id == current_user.id,
            Job.status == JobStatus.completed,
        ]
        if character_id is not None:
            base_filter.append(Job.character_id == character_id)
        if job_type is not None:
            base_filter.append(Job.job_type == job_type)

        count_result = await db.execute(
            select(func.count(Job.id)).where(*base_filter)
        )
        total = count_result.scalar_one()

        jobs_result = await db.execute(
            select(Job)
            .where(*base_filter)
            .order_by(Job.completed_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        jobs = list(jobs_result.scalars().all())
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error listing gallery for user %s", current_user.id)
        raise

    return PaginatedResponse(
        items=[JobResponse.model_validate(j) for j in jobs],
        total=total,
        page=page,
        per_page=per_page,
        has_next=(page * per_page) < total,
    )


@router.get("/{job_id}/media")
async def get_media(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    try:
        result = await db.execute(
            select(Job).where(
                Job.id == job_id,
                Job.user_id == current_user.id,
                Job.status == JobStatus.completed,
            )
        )
        job = result.scalar_one_or_none()
    except Exception:
        logger.exception("DB error fetching job %s for media", job_id)
        raise

    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.output_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Output file not available"
        )

    output_path = Path(job.output_path)
    if not output_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Output file missing on disk"
        )

    suffix = output_path.suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
    }
    media_type = media_type_map.get(suffix, "application/octet-stream")

    def _iter_file():
        with output_path.open("rb") as f:
            while chunk := f.read(65536):
                yield chunk

    return StreamingResponse(
        _iter_file(),
        media_type=media_type,
        headers={"Cache-Control": "private, max-age=86400"},
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gallery_item(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        result = await db.execute(
            select(Job).where(
                Job.id == job_id,
                Job.user_id == current_user.id,
            )
        )
        job = result.scalar_one_or_none()
    except Exception:
        logger.exception("DB error fetching job %s for deletion", job_id)
        raise

    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.output_path:
        output_path = Path(job.output_path)
        try:
            if output_path.exists():
                output_path.unlink()
        except OSError:
            logger.warning("Could not delete output file %s", output_path)

    try:
        await db.delete(job)
        await db.flush()
    except Exception:
        logger.exception("DB error deleting job %s", job_id)
        raise
