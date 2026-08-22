"""Admin analytics and generation browser API."""

from __future__ import annotations

import io
import logging
import uuid
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.admin_auth import verify_admin
from app.database import get_db
from app.services.admin_dashboard_service import (
    WINDOW_HOURS,
    fetch_chat_characters_for_user,
    fetch_chat_session_messages,
    fetch_chat_users,
    fetch_i2i_groups,
    fetch_i2v_template_groups,
    fetch_jobs_page,
    fetch_overview_counts,
    fetch_source_report,
    fetch_story_groups,
    fetch_story_scenes,
)
from app.services.storage_client import StorageClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}


def _media_type_for_key(key: str) -> str:
    return _MEDIA_TYPES.get(Path(key).suffix.lower(), "application/octet-stream")


def _attach_media_urls(job: dict) -> None:
    jid = job["id"]
    job["output_media_url"] = (
        f"/admin/generations/jobs/{jid}/media?kind=output" if job.get("has_output") else None
    )
    job["source_media_url"] = (
        f"/admin/generations/jobs/{jid}/media?kind=input" if job.get("has_source") else None
    )
    job.pop("output_r2_key", None)
    job.pop("input_r2_key", None)
    job.pop("has_output", None)
    job.pop("has_source", None)
    job.pop("media_url", None)


@router.get("/report")
async def admin_report(
    _: str = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    sources, razorpay_events = await fetch_source_report(db)
    overview = await fetch_overview_counts(db)
    return {
        "window_hours": WINDOW_HOURS,
        "overview": overview,
        "sources": sources,
        "razorpay_payment_events": razorpay_events,
    }


@router.get("/generations/i2v/meta")
async def i2v_meta(
    _: str = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return {
        "templates": await fetch_i2v_template_groups(db),
        "stories": await fetch_story_groups(db),
    }


@router.get("/generations/i2v/story/{story_id}")
async def i2v_story_detail(
    story_id: str,
    _: str = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return {"story_id": story_id, "scenes": await fetch_story_scenes(db, story_id)}


@router.get("/generations/i2i/meta")
async def i2i_meta(
    _: str = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return {"groups": await fetch_i2i_groups(db)}


@router.get("/generations/jobs")
async def list_jobs(
    scene_id: str | None = None,
    i2v_bucket: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    _: str = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    jobs, total = await fetch_jobs_page(
        db,
        scene_id=scene_id,
        i2v_bucket=i2v_bucket,
        page=page,
        per_page=per_page,
    )
    for job in jobs:
        _attach_media_urls(job)
    pages = max(1, (total + per_page - 1) // per_page)
    return {"items": jobs, "total": total, "page": page, "pages": pages, "per_page": per_page}


@router.get("/generations/jobs/{job_id}/media")
async def job_media(
    job_id: uuid.UUID,
    kind: Literal["input", "output"] = Query("output"),
    _: str = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    row = (
        await db.execute(
            text(
                """
                SELECT input_r2_key, output_r2_key
                FROM jobs
                WHERE id = :job_id AND status = 'completed'
                """
            ),
            {"job_id": str(job_id)},
        )
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    key = row["input_r2_key"] if kind == "input" else row["output_r2_key"]
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not available")

    storage = StorageClient(settings)
    try:
        data = await storage.download(key)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File missing in storage",
        ) from None
    except Exception:
        logger.exception("Admin media download failed job=%s kind=%s", job_id, kind)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch media",
        ) from None

    return StreamingResponse(
        io.BytesIO(data),
        media_type=_media_type_for_key(key),
        headers={
            "Cache-Control": "private, max-age=3600",
            "Content-Disposition": "inline",
        },
    )


@router.get("/generations/chat/users")
async def list_chat_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    _: str = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    items, total = await fetch_chat_users(db, page=page, per_page=per_page)
    pages = max(1, (total + per_page - 1) // per_page)
    return {"items": items, "total": total, "page": page, "pages": pages}


@router.get("/generations/chat/users/{user_id}/characters")
async def list_chat_characters(
    user_id: uuid.UUID,
    _: str = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    items = await fetch_chat_characters_for_user(db, str(user_id))
    return {"items": items}


@router.get("/generations/chat/sessions/{session_id}")
async def get_chat_session(
    session_id: uuid.UUID,
    _: str = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = await fetch_chat_session_messages(db, str(session_id))
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return data


@router.get("/verify")
async def verify(_: str = Depends(verify_admin)) -> dict:
    return {"ok": True}
