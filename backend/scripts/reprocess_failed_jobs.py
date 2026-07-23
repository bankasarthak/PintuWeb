#!/usr/bin/env python3
"""
Re-queue failed/timed-out jobs after an infra outage.

For each eligible job:
  1. Optionally repair missing comfyui_workflow (website i2v_custom).
  2. Debit credits again (original amount; idempotent per job).
  3. Reset job to QUEUED so the pod worker picks it up and delivers via the normal webhook.

Usage (from backend/):
  python scripts/reprocess_failed_jobs.py --hours 1 --dry-run
  python scripts/reprocess_failed_jobs.py --hours 1 --execute
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.database import AsyncSessionLocal
from app.i2v_constants import I2V_POD_TARGET
from app.models.job import Job, JobStatus, JobType
from app.services.credit_service import CreditService
from app.services.i2v_job_builder import build_i2v_custom_job_params, single_unet_for_pod
from app.services.image_prep import prepare_i2v_image
from app.services.storage_client import StorageClient
from app.core.exceptions import ConflictError

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("reprocess")

_I2V_TYPES = {JobType.i2v, JobType.i2v_custom}

# Infra failures from the ComfyUI outage — skip unrelated failures unless --all-errors.
_DEFAULT_ERROR_SUBSTRINGS = (
    "Failed to upload input to ComfyUI",
    "ComfyUI submission failed",
    "Job exceeded max duration",
    "Worker unhandled exception",
    "No ComfyUI pod configured",
)


async def _repair_website_workflow(job: Job, storage: StorageClient) -> dict:
    """Rebuild comfyui_workflow for website i2v_custom jobs submitted before workflow builder."""
    params = dict(job.job_params or {})
    if params.get("comfyui_workflow"):
        return params
    if job.job_type != JobType.i2v_custom or not job.input_r2_key:
        return params

    final = (job.final_prompt or job.enhanced_prompt or job.custom_prompt or "").strip()
    if not final:
        raise ValueError("missing final_prompt")

    raw_bytes = await storage.download(job.input_r2_key)
    _, width, height = prepare_i2v_image(raw_bytes)
    lora_id = params.get("enhanced_lora") or params.get("lora_id")

    rebuilt = build_i2v_custom_job_params(
        final_prompt=final,
        raw_user_prompt=job.custom_prompt or job.user_prompt or "",
        image_width=width,
        image_height=height,
        lora_id=lora_id,
        pod_target=I2V_POD_TARGET,
        single_unet=single_unet_for_pod(I2V_POD_TARGET, settings.COMFYUI_SINGLE_UNET),
    )
    params.update(rebuilt)
    logger.info("Rebuilt comfyui_workflow for job %s (%dx%d)", job.id, width, height)
    return params


async def reprocess(*, hours: float, dry_run: bool, all_errors: bool) -> int:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    storage = StorageClient(settings)
    requeued = 0
    skipped = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job)
            .where(
                Job.status.in_([JobStatus.failed, JobStatus.timed_out]),
                Job.completed_at >= since,
                Job.job_type.in_(list(_I2V_TYPES)),
            )
            .order_by(Job.completed_at.asc())
        )
        jobs = list(result.scalars().all())

    logger.info("Found %d failed/timed_out I2V jobs since %s", len(jobs), since.isoformat())

    for job in jobs:
        err = (job.error_message or "").strip()
        if not all_errors and not any(s in err for s in _DEFAULT_ERROR_SUBSTRINGS):
            logger.info("SKIP %s — error not infra-related: %s", job.id, err[:80])
            skipped += 1
            continue

        if not job.input_r2_key:
            logger.warning("SKIP %s — no input_r2_key", job.id)
            skipped += 1
            continue

        amount = float(job.credits_charged or 0)
        debit_key = f"reprocess_debit:{job.id}"

        if dry_run:
            needs_wf = not (job.job_params or {}).get("comfyui_workflow")
            logger.info(
                "DRY-RUN requeue %s entry=%s type=%s credits=%.2f needs_workflow=%s err=%s",
                job.id,
                job.entry_point,
                job.job_type.value,
                amount,
                needs_wf,
                err[:60],
            )
            requeued += 1
            continue

        async with AsyncSessionLocal() as db:
            row = (
                await db.execute(select(Job).where(Job.id == job.id).with_for_update())
            ).scalar_one()

            if row.status not in (JobStatus.failed, JobStatus.timed_out):
                logger.info("SKIP %s — status changed to %s", job.id, row.status.value)
                skipped += 1
                continue

            try:
                job_params = await _repair_website_workflow(row, storage)
            except Exception as exc:
                logger.error("SKIP %s — workflow repair failed: %s", job.id, exc)
                skipped += 1
                continue

            if row.job_type in _I2V_TYPES and not job_params.get("comfyui_workflow"):
                logger.error("SKIP %s — still no comfyui_workflow", job.id)
                skipped += 1
                continue

            svc = CreditService(db)
            try:
                if amount > 0:
                    await svc.debit(
                        user_id=row.user_id,
                        amount=amount,
                        description=f"Reprocess after outage: job {row.id}",
                        job_id=row.id,
                        idempotency_key=debit_key,
                    )
            except ConflictError as exc:
                logger.warning("SKIP %s — debit failed: %s", job.id, exc)
                skipped += 1
                continue

            row.job_params = job_params
            row.status = JobStatus.queued
            row.error_message = None
            row.completed_at = None
            row.claimed_at = None
            row.processing_at = None
            row.pod_id = None
            row.comfyui_prompt_id = None
            row.output_r2_key = None
            row.delivered_at = None
            row.delivery_attempts = 0
            row.lock_expires_at = None
            row.attempt_count = 0
            row.queued_at = datetime.now(timezone.utc)
            row.priority = max(int(row.priority or 5), 8)  # bump so outage victims go first

            await db.commit()
            logger.info(
                "REQUEUED %s entry=%s debited=%.2f",
                row.id,
                row.entry_point,
                amount,
            )
            requeued += 1

    logger.info("Done: requeued=%d skipped=%d dry_run=%s", requeued, skipped, dry_run)
    return 0 if skipped == 0 or requeued > 0 else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-queue failed I2V jobs after infra outage")
    parser.add_argument("--hours", type=float, default=1.0, help="Look back window (default: 1)")
    parser.add_argument("--dry-run", action="store_true", help="List jobs only, no DB changes")
    parser.add_argument("--execute", action="store_true", help="Apply changes (debit + requeue)")
    parser.add_argument(
        "--all-errors",
        action="store_true",
        help="Include failures not matching known infra error messages",
    )
    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        parser.error("Pass --dry-run or --execute")

    raise SystemExit(asyncio.run(reprocess(hours=args.hours, dry_run=args.dry_run, all_errors=args.all_errors)))


if __name__ == "__main__":
    main()
