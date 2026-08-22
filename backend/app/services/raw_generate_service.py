"""
RawGenerateService — internal, key/token-only I2V generation for trusted sibling
apps and external partners (e.g. invite-maker, a wedding-invitation service) that
already have a finished prompt and want zero PintuWeb business logic (no prompt
enhancement, no LoRA auto-attach, no credit debit).

Jobs still flow through the exact same shared `jobs` table and GPU worker as every
other PintuV3/PintuWeb job, so there is only ever one job processing per GPU pod.
They are inserted with the "admin" priority tier so they jump the queue.

Each caller gets its own `entry_point` / service-account email (passed into the
constructor) so jobs stay attributable and isolated per caller even though the
underlying job-building logic (build_raw_i2v_job_params) is shared. See
app/routers/internal.py (invite-maker, X-Service-Token auth) and
app/routers/partner.py (external partners, X-API-Key auth) for the two callers.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.core.exceptions import AppValidationError, NotFoundError
from app.i2v_constants import I2V_POD_TARGET
from app.models.job import Job, JobStatus, JobType
from app.models.user import User
from app.services.i2v_job_builder import build_raw_i2v_job_params, single_unet_for_pod
from app.services.image_prep import prepare_i2v_image
from app.services.storage_client import StorageClient

logger = logging.getLogger(__name__)

# Same "admin" tier the Telegram bot uses for /admintest — highest priority, served first.
RAW_GENERATE_PRIORITY = 10
RAW_GENERATE_ENTRY_POINT = "invite-maker"
SERVICE_USER_EMAIL = "invitemaker@pintuweb.internal"


class RawGenerateService:
    def __init__(
        self,
        db: AsyncSession,
        settings: Settings,
        storage: StorageClient,
        *,
        entry_point: str = RAW_GENERATE_ENTRY_POINT,
        service_user_email: str = SERVICE_USER_EMAIL,
        priority: int = RAW_GENERATE_PRIORITY,
    ) -> None:
        self._db = db
        self._settings = settings
        self._storage = storage
        self._entry_point = entry_point
        self._service_user_email = service_user_email
        self._priority = priority

    async def _ensure_service_user(self) -> User:
        """Get-or-create the single shared service account these jobs are billed to."""
        result = await self._db.execute(select(User).where(User.email == self._service_user_email))
        user = result.scalar_one_or_none()
        if user is not None:
            return user

        user = User(
            id=uuid.uuid4(),
            email=self._service_user_email,
            hashed_password=None,
            auth_source="service",
            display_name=f"{self._entry_point} (service)",
            credits=0,
            plan_id="free",
            is_active=True,
            is_verified=True,
        )
        self._db.add(user)
        await self._db.flush()
        logger.info("Created %s service user %s", self._entry_point, user.id)
        return user

    async def create_raw_job(
        self,
        *,
        source_image: bytes,
        prompt: str,
        negative_prompt: str = "",
        num_frames: int | None = None,
        fps: int | None = None,
        guidance_scale: float | None = None,
        num_inference_steps: int | None = None,
        idempotency_key: str | None = None,
    ) -> Job:
        prompt = prompt.strip()
        if not prompt:
            raise AppValidationError("prompt is required")

        user = await self._ensure_service_user()

        upload_bytes, width, height = prepare_i2v_image(source_image)
        input_r2_key = await self._storage.upload(
            upload_bytes, prefix=f"inputs/{self._entry_point}", suffix=".jpg"
        )

        kwargs: dict = {
            "prompt": prompt,
            "negative_prompt": negative_prompt or "",
            "image_width": width,
            "image_height": height,
            "pod_target": I2V_POD_TARGET,
            "single_unet": single_unet_for_pod(I2V_POD_TARGET, self._settings.COMFYUI_SINGLE_UNET),
        }
        if num_frames is not None:
            kwargs["num_frames"] = num_frames
        if fps is not None:
            kwargs["fps"] = fps
        if guidance_scale is not None:
            kwargs["guidance_scale"] = guidance_scale
        if num_inference_steps is not None:
            kwargs["num_inference_steps"] = num_inference_steps

        job_params = build_raw_i2v_job_params(**kwargs)

        job = Job(
            id=uuid.uuid4(),
            user_id=user.id,
            job_type=JobType.i2v_custom,
            status=JobStatus.queued,
            entry_point=self._entry_point,
            priority=self._priority,
            user_prompt=prompt,
            custom_prompt=prompt,
            final_prompt=prompt,
            negative_prompt=negative_prompt or None,
            input_r2_key=input_r2_key,
            credits_charged=0,
            job_params=job_params,
            idempotency_key=idempotency_key,
            queued_at=datetime.now(timezone.utc),
        )
        self._db.add(job)
        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error inserting raw job for entry_point=%s", self._entry_point)
            raise

        logger.info(
            "Raw I2V job %s queued for %s (priority=%d, %dx%d)",
            job.id, self._entry_point, self._priority, width, height,
        )
        return job

    async def get_job(self, job_id: uuid.UUID) -> Job:
        result = await self._db.execute(
            select(Job).where(Job.id == job_id, Job.entry_point == self._entry_point)
        )
        job = result.scalar_one_or_none()
        if job is None:
            raise NotFoundError(f"Job {job_id} not found")
        return job

    async def get_output_url(self, job: Job) -> str | None:
        if not job.output_r2_key:
            return None
        try:
            return await self._storage.presigned_url(job.output_r2_key)
        except Exception:
            logger.warning("Could not generate presigned URL for job %s", job.id)
            return None
