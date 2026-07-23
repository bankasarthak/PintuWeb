"""Ask the Telegram bot to build ComfyUI workflows for registry templates."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp

from app.config import Settings
from app.core.exceptions import AppValidationError, NotFoundError

logger = logging.getLogger(__name__)


class BotWorkflowClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def _base(self) -> str:
        return self._settings.BOT_WEBAPP_BASE_URL.rstrip("/")

    @property
    def _token(self) -> str:
        return self._settings.BOT_SERVICE_TOKEN or self._settings.SERVICE_API_TOKEN

    async def build_template_job(
        self,
        *,
        template_id: str,
        width: int,
        height: int,
        pod_target: str,
    ) -> dict[str, Any]:
        if not self._settings.BOT_WEBAPP_BASE_URL:
            raise AppValidationError("Template generation is not configured (BOT_WEBAPP_BASE_URL)")

        token = self._token
        if not token:
            raise AppValidationError("Template generation is not configured (SERVICE_API_TOKEN)")

        url = f"{self._base}/internal/build-workflow"
        payload = {
            "template_id": template_id,
            "width": width,
            "height": height,
            "pod_target": pod_target,
        }
        headers = {"X-Service-Token": token, "Content-Type": "application/json"}
        timeout = aiohttp.ClientTimeout(total=60)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                data = await resp.json(content_type=None)
                if resp.status == 404:
                    raise NotFoundError(f"Template '{template_id}' not found")
                if resp.status == 401:
                    raise AppValidationError("Bot workflow service unauthorized — check SERVICE_API_TOKEN")
                if resp.status >= 400 or not data.get("ok"):
                    message = data.get("error") or f"Bot workflow service failed ({resp.status})"
                    raise AppValidationError(message)
                return data
