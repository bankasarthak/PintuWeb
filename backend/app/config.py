from __future__ import annotations

import json
import logging
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/pintuweb"

    # ── Auth ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-to-a-random-32-char-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── LLM (Ollama) ──────────────────────────────────────────────────────────
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "hf.co/HauhauCS/Qwen3.5-27B-Uncensored-HauhauCS-Aggressive:Q4_K_M"
    OLLAMA_CHAT_MAX_CONTEXT: int = 500

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # ── File / Upload limits ──────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 10

    # ── Legacy local data dir (dev only, unused in prod) ─────────────────────
    DATA_DIR: str = "data"

    # ── Cloudflare R2 ─────────────────────────────────────────────────────────
    # Set all four to enable R2. If not set, falls back to local disk (dev only).
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET: str = "pintuweb-media"
    # Public CDN URL for the bucket (leave blank to use presigned URLs instead)
    R2_PUBLIC_URL: str = ""

    # ── ComfyUI pods ─────────────────────────────────────────────────────────
    # JSON dict: {"i2i": "http://pod1:8188", "i2v": "http://pod2:8188"}
    # Keys are pod names; values are ComfyUI base URLs.
    COMFYUI_PODS: dict[str, str] = {}

    # ── Worker settings ───────────────────────────────────────────────────────
    WORKER_POLL_INTERVAL_SECS: int = 3
    # How many seconds a claimed job's lock is valid before watchdog reclaims it
    JOB_LOCK_TTL_SECS: int = 300  # 5 minutes
    # Max total seconds for a single ComfyUI job before it's considered timed-out
    JOB_MAX_DURATION_SECS: int = 600  # 10 minutes
    # Name/ID of this worker pod (set per-process, e.g. via env on the pod)
    POD_ID: str = "local"
    # Types of jobs this worker handles (comma-sep string or JSON list)
    WORKER_JOB_TYPES: list[str] = ["i2i", "i2v", "i2i_custom", "i2v_custom", "random_ai"]

    # ── Service API token (used by Telegram bot to call this backend) ─────────
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    SERVICE_API_TOKEN: str = ""

    # ── Telegram delivery (set on worker pod so it can push results to Telegram) ──
    # The worker calls the bot's /deliver endpoint after each completed job.
    # Leave blank to disable Telegram push delivery (bot will poll instead).
    TELEGRAM_BOT_TOKEN: str = ""
    # URL of the Telegram delivery webhook on the bot process.
    # Example: http://my-bot-host:8001/internal/deliver
    BOT_DELIVERY_URL: str = ""
    # Shared secret between worker and bot — validated by the bot before delivering.
    BOT_DELIVERY_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # ── Validators ────────────────────────────────────────────────────────────
    @field_validator("COMFYUI_PODS", mode="before")
    @classmethod
    def _parse_pods(cls, v: Any) -> dict[str, str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError as exc:
                logger.error("Failed to parse COMFYUI_PODS JSON: %s", exc)
                return {}
        return v if isinstance(v, dict) else {}

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [o.strip() for o in v.split(",") if o.strip()]
        return v if isinstance(v, list) else []

    @field_validator("WORKER_JOB_TYPES", mode="before")
    @classmethod
    def _parse_job_types(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [t.strip() for t in v.split(",") if t.strip()]
        return v if isinstance(v, list) else []

    @property
    def r2_enabled(self) -> bool:
        return bool(self.R2_ACCOUNT_ID and self.R2_ACCESS_KEY_ID and self.R2_SECRET_ACCESS_KEY)

    @property
    def r2_endpoint_url(self) -> str:
        return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"


settings = Settings()
