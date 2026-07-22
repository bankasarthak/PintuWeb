#!/usr/bin/env python3
"""
Pod worker — runs on each GPU pod.

Lifecycle per job:
  QUEUED → CLAIMED (lock_expires_at set)
         → PROCESSING (ComfyUI submitted)
         → COMPLETED / FAILED / TIMED_OUT
  On failure: credits refunded, input R2 key cleaned up.
  On success: output fetched from ComfyUI, uploaded to R2.
  In all cases: ComfyUI input/output files deleted after delivery.

Run with:
  POD_ID=i2v-pod-1 python -m worker
"""
from __future__ import annotations

import asyncio
import logging
import os
import signal
import sys
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import aiohttp
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

# Allow running as `python worker.py` from the backend dir
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.job import Job, JobStatus, JobType
from app.services.credit_service import CreditService
from app.services.storage_client import StorageClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("worker")

# Graceful shutdown flag
_shutdown = asyncio.Event()


def _handle_signal(sig: int, _frame: object) -> None:
    logger.info("Received signal %s — graceful shutdown", sig)
    _shutdown.set()


signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT, _handle_signal)


# ── Claim ─────────────────────────────────────────────────────────────────────

async def claim_next_job(db: AsyncSession) -> Job | None:
    """
    Atomically claim the highest-priority QUEUED job using SKIP LOCKED.
    Only processes job types this worker is configured to handle.
    """
    now = datetime.now(timezone.utc)
    lock_until = now + timedelta(seconds=settings.JOB_LOCK_TTL_SECS)

    allowed_types = settings.WORKER_JOB_TYPES

    result = await db.execute(
        select(Job)
        .where(
            Job.status == JobStatus.queued,
            Job.job_type.in_(allowed_types),
        )
        .order_by(Job.priority.desc(), Job.queued_at.asc())
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    job = result.scalar_one_or_none()
    if job is None:
        return None

    job.status = JobStatus.claimed
    job.claimed_at = now
    job.lock_expires_at = lock_until
    job.pod_id = settings.POD_ID
    job.attempt_count += 1
    await db.commit()
    logger.info("Claimed job %s (type=%s attempt=%d)", job.id, job.job_type.value, job.attempt_count)
    return job


# ── ComfyUI interaction ───────────────────────────────────────────────────────

def _pod_url() -> str | None:
    pods = settings.COMFYUI_PODS
    if not pods:
        return None
    # Use pod_id-specific URL if configured, else first available
    return pods.get(settings.POD_ID) or next(iter(pods.values()))


async def _upload_input_to_comfyui(
    session: aiohttp.ClientSession, pod_url: str, image_bytes: bytes, filename: str
) -> str:
    """Upload input image to ComfyUI /upload/image. Returns the ComfyUI filename."""
    data = aiohttp.FormData()
    data.add_field("image", image_bytes, filename=filename, content_type="image/jpeg")
    async with session.post(f"{pod_url}/upload/image", data=data) as resp:
        resp.raise_for_status()
        result = await resp.json(content_type=None)
        return result["name"]


async def _submit_workflow(
    session: aiohttp.ClientSession, pod_url: str, job: Job, comfyui_input_name: str | None
) -> str:
    """Submit the workflow to ComfyUI. Returns prompt_id."""
    payload = {
        "prompt": {
            "job_id": str(job.id),
            "job_type": job.job_type.value,
            "lora": job.job_params.get("lora", ""),
            "mood_lora": job.job_params.get("mood_lora", ""),
            "prompt": job.final_prompt or job.enhanced_prompt or job.custom_prompt or "",
            "source_image": comfyui_input_name or "",
        }
    }
    async with session.post(f"{pod_url}/prompt", json=payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
        resp.raise_for_status()
        data = await resp.json(content_type=None)
        return data["prompt_id"]


async def _poll_until_done(
    session: aiohttp.ClientSession,
    pod_url: str,
    prompt_id: str,
    job_id: uuid.UUID,
    deadline: datetime,
) -> dict | None:
    """
    Poll ComfyUI /history/{prompt_id} until outputs appear or deadline passes.
    Returns the outputs dict, or None on timeout.
    """
    while datetime.now(timezone.utc) < deadline:
        if _shutdown.is_set():
            return None
        await asyncio.sleep(3)
        try:
            async with session.get(
                f"{pod_url}/history/{prompt_id}",
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status != 200:
                    continue
                data = await resp.json(content_type=None)
                entry = data.get(str(prompt_id)) or data.get(prompt_id)
                if not entry:
                    continue
                if entry.get("status", {}).get("status_str") == "error":
                    logger.error("ComfyUI reported error for job %s", job_id)
                    return None
                outputs = entry.get("outputs", {})
                if outputs:
                    return outputs
        except Exception:
            logger.warning("Poll error for job %s", job_id, exc_info=True)
    return None


async def _fetch_output_bytes(
    session: aiohttp.ClientSession, pod_url: str, outputs: dict
) -> tuple[bytes, str] | None:
    """
    Extract the first image/video file from ComfyUI outputs and download it.
    Returns (bytes, filename) or None.
    """
    for node_outputs in outputs.values():
        for field in ("images", "videos", "gifs"):
            files = node_outputs.get(field, [])
            if files:
                f = files[0]
                filename = f["filename"]
                subfolder = f.get("subfolder", "")
                ftype = f.get("type", "output")
                url = f"{pod_url}/view?filename={filename}&subfolder={subfolder}&type={ftype}"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=120)) as resp:
                    resp.raise_for_status()
                    return await resp.read(), filename
    return None


async def _delete_comfyui_file(
    session: aiohttp.ClientSession, pod_url: str, filename: str, subfolder: str = "", ftype: str = "output"
) -> None:
    """Ask ComfyUI to delete a file from its input/output folder."""
    try:
        async with session.delete(
            f"{pod_url}/delete/item",
            json={"filename": filename, "subfolder": subfolder, "type": ftype},
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if resp.status not in (200, 204, 404):
                logger.warning("ComfyUI delete returned %s for %s", resp.status, filename)
    except Exception:
        logger.warning("ComfyUI file delete failed for %s", filename, exc_info=True)


# ── Main job processor ────────────────────────────────────────────────────────

async def process_job(job: Job) -> None:
    """End-to-end processing of one job."""
    pod_url = _pod_url()
    if not pod_url:
        logger.error("No ComfyUI pod URL configured — cannot process job %s", job.id)
        await _fail_job(job, "No ComfyUI pod configured", refund=True)
        return

    storage = StorageClient(settings)
    deadline = datetime.now(timezone.utc) + timedelta(seconds=settings.JOB_MAX_DURATION_SECS)

    comfyui_input_name: str | None = None
    comfyui_output_filename: str | None = None

    async with aiohttp.ClientSession() as http:
        # ── Mark as PROCESSING ────────────────────────────────────────────────
        async with AsyncSessionLocal() as db:
            job_row = (await db.execute(select(Job).where(Job.id == job.id))).scalar_one()
            job_row.status = JobStatus.processing
            job_row.processing_at = datetime.now(timezone.utc)
            await db.commit()

        # ── Download input from R2 and upload to ComfyUI ──────────────────────
        if job.input_r2_key:
            try:
                input_bytes = await storage.download(job.input_r2_key)
                comfyui_input_name = await _upload_input_to_comfyui(
                    http, pod_url, input_bytes, f"{job.id}.jpg"
                )
                logger.info("Input uploaded to ComfyUI as %s", comfyui_input_name)
            except Exception:
                logger.exception("Input download/upload failed for job %s", job.id)
                await _fail_job(job, "Failed to upload input to ComfyUI", refund=True)
                return

        # ── Submit workflow ────────────────────────────────────────────────────
        try:
            prompt_id = await _submit_workflow(http, pod_url, job, comfyui_input_name)
            async with AsyncSessionLocal() as db:
                job_row = (await db.execute(select(Job).where(Job.id == job.id))).scalar_one()
                job_row.comfyui_prompt_id = prompt_id
                await db.commit()
            logger.info("Job %s submitted to ComfyUI as prompt %s", job.id, prompt_id)
        except Exception:
            logger.exception("ComfyUI submit failed for job %s", job.id)
            await _fail_job(job, "ComfyUI submission failed", refund=True)
            await _cleanup_comfyui_input(http, pod_url, comfyui_input_name)
            return

        # ── Poll for completion ────────────────────────────────────────────────
        outputs = await _poll_until_done(http, pod_url, prompt_id, job.id, deadline)
        if outputs is None:
            logger.error("Job %s timed out or shutdown during poll", job.id)
            await _timeout_job(job)
            await _cleanup_comfyui_input(http, pod_url, comfyui_input_name)
            return

        # ── Download output and upload to R2 ──────────────────────────────────
        result = await _fetch_output_bytes(http, pod_url, outputs)
        if result is None:
            logger.error("No output file found for job %s", job.id)
            await _fail_job(job, "No output file in ComfyUI response", refund=True)
            await _cleanup_comfyui_input(http, pod_url, comfyui_input_name)
            return

        output_bytes, comfyui_output_filename = result
        suffix = ".mp4" if job.job_type == JobType.i2v else ".jpg"

        try:
            output_key = await storage.upload(
                output_bytes, prefix=f"outputs/{job.user_id}", suffix=suffix
            )
        except Exception:
            logger.exception("R2 output upload failed for job %s", job.id)
            await _fail_job(job, "R2 output upload failed", refund=True)
            await _cleanup_comfyui_input(http, pod_url, comfyui_input_name)
            return

        # ── Cleanup ComfyUI files (input + output) ────────────────────────────
        await _cleanup_comfyui_input(http, pod_url, comfyui_input_name)
        if comfyui_output_filename:
            await _delete_comfyui_file(http, pod_url, comfyui_output_filename)

        # ── Mark COMPLETED ─────────────────────────────────────────────────────
        async with AsyncSessionLocal() as db:
            job_row = (await db.execute(select(Job).where(Job.id == job.id))).scalar_one()
            job_row.status = JobStatus.completed
            job_row.output_r2_key = output_key
            job_row.completed_at = datetime.now(timezone.utc)
            job_row.delivered_at = datetime.now(timezone.utc)
            job_params_snapshot = dict(job_row.job_params or {})
            await db.commit()

        logger.info("Job %s completed — output at %s", job.id, output_key)

        # ── Telegram delivery webhook (fire-and-forget) ───────────────────────
        await _notify_telegram_delivery(
            http=http,
            job_id=str(job.id),
            job_type=job.job_type.value,
            output_r2_key=output_key,
            job_params=job_params_snapshot,
            status="completed",
        )


async def _cleanup_comfyui_input(
    session: aiohttp.ClientSession, pod_url: str, comfyui_filename: str | None
) -> None:
    if comfyui_filename:
        await _delete_comfyui_file(session, pod_url, comfyui_filename, ftype="input")


async def _fail_job(job: Job, reason: str, refund: bool = False) -> None:
    job_params_snapshot: dict = {}
    async with AsyncSessionLocal() as db:
        job_row = (await db.execute(select(Job).where(Job.id == job.id))).scalar_one()
        job_row.status = JobStatus.failed
        job_row.error_message = reason
        job_row.completed_at = datetime.now(timezone.utc)
        job_params_snapshot = dict(job_row.job_params or {})

        if refund and job_row.credits_charged > 0:
            svc = CreditService(db)
            await svc.refund(
                user_id=job_row.user_id,
                amount=job_row.credits_charged,
                description=f"Refund for failed job {job_row.id}: {reason}",
                job_id=job_row.id,
                idempotency_key=f"refund_fail:{job_row.id}",
            )
        await db.commit()
    logger.error("Job %s FAILED: %s (refund=%s)", job.id, reason, refund)

    async with aiohttp.ClientSession() as http:
        await _notify_telegram_delivery(
            http=http,
            job_id=str(job.id),
            job_type=job.job_type.value,
            output_r2_key=None,
            job_params=job_params_snapshot,
            status="failed",
            error=reason,
        )


async def _timeout_job(job: Job) -> None:
    job_params_snapshot: dict = {}
    async with AsyncSessionLocal() as db:
        job_row = (await db.execute(select(Job).where(Job.id == job.id))).scalar_one()
        job_row.status = JobStatus.timed_out
        job_row.error_message = "Job exceeded max duration"
        job_row.completed_at = datetime.now(timezone.utc)
        job_params_snapshot = dict(job_row.job_params or {})

        if job_row.credits_charged > 0:
            svc = CreditService(db)
            await svc.refund(
                user_id=job_row.user_id,
                amount=job_row.credits_charged,
                description=f"Refund for timed-out job {job_row.id}",
                job_id=job_row.id,
                idempotency_key=f"refund_timeout:{job_row.id}",
            )
        await db.commit()
    logger.error("Job %s TIMED_OUT", job.id)

    async with aiohttp.ClientSession() as http:
        await _notify_telegram_delivery(
            http=http,
            job_id=str(job.id),
            job_type=job.job_type.value,
            output_r2_key=None,
            job_params=job_params_snapshot,
            status="timed_out",
            error="Job timed out",
        )


async def _notify_telegram_delivery(
    *,
    http: aiohttp.ClientSession,
    job_id: str,
    job_type: str,
    output_r2_key: str | None,
    job_params: dict,
    status: str,
    error: str | None = None,
) -> None:
    """POST job result to the Telegram bot's delivery endpoint.

    The bot reads the payload, downloads the R2 output, and sends it to the user.
    Fire-and-forget — failures are logged but never raise.
    """
    url = settings.BOT_DELIVERY_URL
    secret = settings.BOT_DELIVERY_SECRET
    if not url:
        return  # Telegram push delivery not configured — bot will poll instead

    payload = {
        "job_id": job_id,
        "job_type": job_type,
        "status": status,
        "output_r2_key": output_r2_key,
        "error": error,
        "job_params": job_params,
    }
    headers = {"X-Delivery-Secret": secret} if secret else {}

    for attempt in range(3):
        try:
            async with http.post(
                url,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status < 300:
                    logger.info("Telegram delivery webhook OK: job=%s status=%s", job_id[:8], status)
                    return
                logger.warning(
                    "Telegram delivery webhook returned %s (attempt %d): job=%s",
                    resp.status, attempt + 1, job_id[:8],
                )
        except Exception:
            logger.warning(
                "Telegram delivery webhook failed (attempt %d): job=%s",
                attempt + 1, job_id[:8], exc_info=True,
            )
        if attempt < 2:
            await asyncio.sleep(3)


# ── Main loop ─────────────────────────────────────────────────────────────────

async def run_worker() -> None:
    logger.info("=" * 60)
    logger.info("Worker starting")
    logger.info("Pod ID: %s", settings.POD_ID)
    logger.info("Job types: %s", settings.WORKER_JOB_TYPES)
    logger.info("ComfyUI pods: %s", list(settings.COMFYUI_PODS.keys()))
    logger.info("R2 enabled: %s (bucket=%s)", settings.r2_enabled, settings.R2_BUCKET)
    logger.info("Telegram delivery URL: %s", settings.BOT_DELIVERY_URL or "(disabled)")
    logger.info("Database URL: %s", settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL)
    logger.info("=" * 60)
    while not _shutdown.is_set():
        async with AsyncSessionLocal() as db:
            job = await claim_next_job(db)

        if job is None:
            # Nothing to do — back-off before next poll
            try:
                await asyncio.wait_for(
                    _shutdown.wait(), timeout=settings.WORKER_POLL_INTERVAL_SECS
                )
            except asyncio.TimeoutError:
                pass
            continue

        try:
            await process_job(job)
        except Exception:
            logger.exception("Unhandled exception processing job %s", job.id)
            await _fail_job(job, "Worker unhandled exception", refund=True)

    logger.info("Worker shut down cleanly")


if __name__ == "__main__":
    asyncio.run(run_worker())
