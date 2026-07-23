"""Fetch I2V template catalog + example assets from the Telegram bot webapp server."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp

from app.config import Settings

logger = logging.getLogger(__name__)


class TemplatesService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def _base(self) -> str:
        return self._settings.BOT_WEBAPP_BASE_URL.rstrip("/")

    def is_configured(self) -> bool:
        return bool(self._settings.BOT_WEBAPP_BASE_URL)

    async def fetch_catalog(self) -> dict[str, Any]:
        if not self.is_configured():
            raise RuntimeError("BOT_WEBAPP_BASE_URL is not configured")

        url = f"{self._base}/webapp/api/templates"
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as resp:
                resp.raise_for_status()
                return await resp.json(content_type=None)

    async def fetch_example_bytes(self, template_id: str, filename: str) -> tuple[bytes, str]:
        if not self.is_configured():
            raise RuntimeError("BOT_WEBAPP_BASE_URL is not configured")

        safe_name = filename.replace("/", "").replace("\\", "")
        if safe_name not in ("source.jpg", "preview.mp4", "thumb.jpg"):
            raise ValueError("Unsupported example asset")

        url = f"{self._base}/webapp/examples/{template_id}/{safe_name}"
        timeout = aiohttp.ClientTimeout(total=120)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as resp:
                resp.raise_for_status()
                data = await resp.read()
                content_type = resp.headers.get("Content-Type") or (
                    "video/mp4" if safe_name.endswith(".mp4") else "image/jpeg"
                )
                return data, content_type
