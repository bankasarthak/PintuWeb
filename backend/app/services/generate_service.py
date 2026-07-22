"""
GenerateService — creates and tracks generation jobs.

Job lifecycle owned here:   QUEUED → (worker picks up)
Credit lifecycle delegated: CreditService.debit / .refund

Files never sit on this server:
  - Input images are uploaded to R2 immediately; bytes are NOT stored locally.
  - Output R2 keys are written by the worker after generation.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.core.exceptions import ConflictError, NotFoundError
from app.models.job import Job, JobStatus, JobType
from app.models.user import User
from app.schemas.job import GenerateRequest
from app.services.credit_service import CreditService
from app.services.llm_client import PROMPT_OPTIONS, LLMClient
from app.services.storage_client import StorageClient
from app.services.system_prompt_builder import build_prompt_generation_prompt

logger = logging.getLogger(__name__)

SCENE_CATALOG: dict[str, dict] = {
    "on_a_leash":   {"label": "On a Leash",        "lora": "leash",          "category": "bondage",   "credits": 2},
    "shibari":      {"label": "Shibari",            "lora": "shibari",        "category": "bondage",   "credits": 2},
    "pillory":      {"label": "Pillory",            "lora": "pillory",        "category": "bondage",   "credits": 2},
    "tied_to_bed":  {"label": "Tied to Bed",        "lora": "tied_bed",       "category": "bondage",   "credits": 2},
    "bondage_gear": {"label": "Full Bondage Gear",  "lora": "bodychain",      "category": "bondage",   "credits": 3},
    "doggy_style":  {"label": "Doggy Style",        "lora": "doggy_front",    "category": "intimate",  "credits": 3},
    "full_nelson":  {"label": "Full Nelson",        "lora": "full_nelson",    "category": "intimate",  "credits": 3},
    "downblouse":   {"label": "Downblouse",         "lora": "downblouse",     "category": "intimate",  "credits": 2},
    "garter":       {"label": "Garter & Stockings", "lora": "garter",         "category": "lingerie",  "credits": 2},
    "undressing":   {"label": "Mid-Strip",          "lora": "undressing",     "category": "lingerie",  "credits": 2},
    "facial":       {"label": "Facial",             "lora": "cum_facial",     "category": "aftermath", "credits": 3},
    "body_marked":  {"label": "Body Marked",        "lora": "cum_body",       "category": "aftermath", "credits": 3},
    "whip_marks":   {"label": "Whip Marks",         "lora": "lash_marks",     "category": "aftermath", "credits": 3},
}

MOOD_CATALOG: dict[str, dict] = {
    "pleading":      {"label": "Pleading",      "lora": "pleading"},
    "shocked":       {"label": "Shocked",       "lora": "shocked"},
    "crying_makeup": {"label": "Crying Makeup", "lora": "running_makeup"},
}

_CREDIT_COSTS: dict[JobType, int] = {
    JobType.i2i: 2,
    JobType.i2v: 3,
    JobType.i2i_custom: 2,
    JobType.i2v_custom: 3,
    JobType.random_ai: 1,
}

# Subscription plan → job queue priority (higher = processed first)
_PLAN_PRIORITY: dict[str, int] = {
    "free": 5,
    "starter": 6,
    "pro": 7,
    "elite": 9,
}


class GenerateService:
    def __init__(
        self,
        db: AsyncSession,
        settings: Settings,
        llm: LLMClient,
        storage: StorageClient,
    ) -> None:
        self._db = db
        self._settings = settings
        self._llm = llm
        self._storage = storage

    def get_scene_catalog(self) -> dict[str, dict]:
        return SCENE_CATALOG

    def get_mood_catalog(self) -> dict[str, dict]:
        return MOOD_CATALOG

    async def create_job(
        self,
        user_id: uuid.UUID,
        req: GenerateRequest,
        source_image: bytes | None = None,
        entry_point: str = "website",
        idempotency_key: str | None = None,
    ) -> Job:
        if req.scene_id and req.scene_id not in SCENE_CATALOG:
            raise NotFoundError(f"Scene '{req.scene_id}' not found")

        credit_cost = (
            SCENE_CATALOG[req.scene_id]["credits"]
            if req.scene_id
            else _CREDIT_COSTS.get(req.job_type, 2)
        )

        # Resolve queue priority from user's plan
        user_result = await self._db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user is None:
            raise NotFoundError("User not found")
        priority = _PLAN_PRIORITY.get(user.plan_id, 5)

        # 1. Atomic credit debit (SELECT FOR UPDATE inside)
        credits_svc = CreditService(self._db)
        debit_idem = f"debit:{idempotency_key}" if idempotency_key else None
        await credits_svc.debit(
            user_id=user_id,
            amount=credit_cost,
            description=f"Job {req.job_type.value}" + (f" scene={req.scene_id}" if req.scene_id else ""),
            idempotency_key=debit_idem,
        )

        # 2. Upload input image to R2 (never kept on disk)
        input_r2_key: str | None = None
        if source_image is not None:
            try:
                suffix = ".jpg"
                input_r2_key = await self._storage.upload(
                    source_image, prefix=f"inputs/{user_id}", suffix=suffix
                )
            except Exception:
                logger.exception("R2 upload failed for user %s — refunding", user_id)
                await credits_svc.refund(
                    user_id=user_id,
                    amount=credit_cost,
                    description="Refund: R2 upload failure",
                    idempotency_key=f"refund_upload:{idempotency_key}" if idempotency_key else None,
                )
                raise

        # 3. Optional prompt enhancement
        enhanced_prompt: str | None = None
        if req.enhance_prompt and req.custom_prompt:
            try:
                sys_prompt = build_prompt_generation_prompt(req.job_type.value)
                messages = [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": req.custom_prompt},
                ]
                enhanced_prompt = await self._llm.complete(messages, options=PROMPT_OPTIONS)
            except Exception:
                logger.warning("Prompt enhancement failed — using original")
                enhanced_prompt = req.custom_prompt

        # 4. Build job_params for the worker
        scene = SCENE_CATALOG.get(req.scene_id or "", {})
        job_params: dict = {
            "lora": scene.get("lora", ""),
            "mood_lora": MOOD_CATALOG.get(req.mood_modifier or "", {}).get("lora", ""),
        }

        # 5. Insert job (status=QUEUED — worker claims it via SKIP LOCKED)
        job = Job(
            id=uuid.uuid4(),
            user_id=user_id,
            character_id=req.character_id,
            job_type=req.job_type,
            status=JobStatus.queued,
            entry_point=entry_point,
            priority=priority,
            scene_id=req.scene_id,
            mood_modifier=req.mood_modifier,
            user_prompt=req.custom_prompt,
            custom_prompt=req.custom_prompt,
            enhanced_prompt=enhanced_prompt,
            final_prompt=enhanced_prompt or req.custom_prompt,
            input_r2_key=input_r2_key,
            credits_charged=credit_cost,
            job_params=job_params,
            idempotency_key=idempotency_key,
            queued_at=datetime.now(timezone.utc),
        )
        self._db.add(job)

        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error inserting job for user %s", user_id)
            raise

        logger.info("Job %s queued (type=%s priority=%d)", job.id, job.job_type.value, priority)
        return job

    async def get_job(self, user_id: uuid.UUID, job_id: uuid.UUID) -> Job:
        result = await self._db.execute(
            select(Job).where(Job.id == job_id, Job.user_id == user_id)
        )
        job = result.scalar_one_or_none()
        if job is None:
            raise NotFoundError(f"Job {job_id} not found")
        return job

    async def list_jobs(
        self,
        user_id: uuid.UUID,
        character_id: uuid.UUID | None,
        page: int,
        per_page: int,
    ) -> tuple[list[Job], int]:
        offset = (page - 1) * per_page
        query = select(Job).where(Job.user_id == user_id)
        count_query = select(func.count(Job.id)).where(Job.user_id == user_id)

        if character_id is not None:
            query = query.where(Job.character_id == character_id)
            count_query = count_query.where(Job.character_id == character_id)

        total = (await self._db.execute(count_query)).scalar_one()
        jobs = list(
            (
                await self._db.execute(
                    query.order_by(Job.created_at.desc()).offset(offset).limit(per_page)
                )
            ).scalars()
        )
        return jobs, total

    async def get_output_url(self, job: Job) -> str | None:
        """Return a presigned R2 URL for the output, if available."""
        if not job.output_r2_key:
            return None
        try:
            return await self._storage.presigned_url(job.output_r2_key)
        except Exception:
            logger.warning("Could not generate presigned URL for job %s", job.id)
            return None
