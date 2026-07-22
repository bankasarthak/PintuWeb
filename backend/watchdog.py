#!/usr/bin/env python3
"""
Watchdog — runs as a background task alongside the API server (or standalone).

Responsibilities:
1. Re-queue CLAIMED jobs whose lock_expires_at has passed (pod crashed / network split).
2. Mark jobs TIMED_OUT if they've been PROCESSING longer than JOB_MAX_DURATION_SECS.
3. Refund credits for any FAILED/TIMED_OUT jobs that still have unreturned credits.

Run standalone:
  python -m watchdog

Or start from within FastAPI on startup:
  asyncio.create_task(watchdog.run_watchdog())
"""
from __future__ import annotations

import asyncio
import logging
import signal
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.job import Job, JobStatus
from app.services.credit_service import CreditService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("watchdog")

_WATCHDOG_INTERVAL_SECS = 30
_shutdown = asyncio.Event()


def _handle_signal(sig: int, _frame: object) -> None:
    logger.info("Watchdog received signal %s", sig)
    _shutdown.set()


signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT, _handle_signal)


async def recover_stuck_claimed_jobs() -> int:
    """
    Jobs that are CLAIMED but whose lock has expired → reset to QUEUED.
    This happens when a pod crashes mid-claim before submitting to ComfyUI.
    """
    now = datetime.now(timezone.utc)
    recovered = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job).where(
                Job.status == JobStatus.claimed,
                Job.lock_expires_at < now,
            ).with_for_update(skip_locked=True)
        )
        jobs = result.scalars().all()

        for job in jobs:
            if job.attempt_count >= job.max_attempts:
                job.status = JobStatus.failed
                job.error_message = f"Exhausted {job.max_attempts} attempts"
                if job.credits_charged > 0:
                    svc = CreditService(db)
                    await svc.refund(
                        user_id=job.user_id,
                        amount=job.credits_charged,
                        description=f"Refund: max attempts exceeded for job {job.id}",
                        job_id=job.id,
                        idempotency_key=f"refund_maxattempts:{job.id}",
                    )
                logger.warning("Job %s exhausted retries — marked FAILED", job.id)
            else:
                job.status = JobStatus.queued
                job.pod_id = None
                job.claimed_at = None
                job.lock_expires_at = None
                logger.info(
                    "Job %s lock expired — re-queued (attempt %d/%d)",
                    job.id, job.attempt_count, job.max_attempts,
                )
            recovered += 1

        if recovered:
            await db.commit()

    return recovered


async def recover_processing_timeout_jobs() -> int:
    """
    Jobs that have been PROCESSING longer than JOB_MAX_DURATION_SECS
    → mark TIMED_OUT and refund credits.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.JOB_MAX_DURATION_SECS)
    timed_out = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job).where(
                Job.status == JobStatus.processing,
                Job.processing_at < cutoff,
            ).with_for_update(skip_locked=True)
        )
        jobs = result.scalars().all()

        for job in jobs:
            job.status = JobStatus.timed_out
            job.error_message = f"Timed out after {settings.JOB_MAX_DURATION_SECS}s"
            job.completed_at = datetime.now(timezone.utc)

            if job.credits_charged > 0:
                svc = CreditService(db)
                await svc.refund(
                    user_id=job.user_id,
                    amount=job.credits_charged,
                    description=f"Refund: processing timeout for job {job.id}",
                    job_id=job.id,
                    idempotency_key=f"refund_timeout:{job.id}",
                )
            logger.warning("Job %s timed out and refunded", job.id)
            timed_out += 1

        if timed_out:
            await db.commit()

    return timed_out


async def run_watchdog() -> None:
    logger.info("Watchdog starting (interval=%ds)", _WATCHDOG_INTERVAL_SECS)
    while not _shutdown.is_set():
        try:
            claimed = await recover_stuck_claimed_jobs()
            processing = await recover_processing_timeout_jobs()
            if claimed or processing:
                logger.info(
                    "Watchdog cycle: re-queued %d stuck, timed-out %d processing",
                    claimed, processing,
                )
        except Exception:
            logger.exception("Watchdog cycle error")

        try:
            await asyncio.wait_for(_shutdown.wait(), timeout=_WATCHDOG_INTERVAL_SECS)
        except asyncio.TimeoutError:
            pass

    logger.info("Watchdog shut down")


if __name__ == "__main__":
    asyncio.run(run_watchdog())
