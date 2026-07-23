"""Proxy story catalog from the Telegram bot webapp server."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp

from app.config import Settings

logger = logging.getLogger(__name__)


class StoriesService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def _base(self) -> str:
        return self._settings.BOT_WEBAPP_BASE_URL.rstrip("/")

    def is_configured(self) -> bool:
        return bool(self._settings.BOT_WEBAPP_BASE_URL)

    async def fetch_stories(self) -> list[dict[str, Any]]:
        if not self.is_configured():
            raise RuntimeError("BOT_WEBAPP_BASE_URL is not configured")

        url = f"{self._base}/webapp/api/stories"
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as resp:
                resp.raise_for_status()
                data = await resp.json(content_type=None)
                return data if isinstance(data, list) else []

    async def fetch_story_detail(self, story_id: str) -> dict[str, Any] | None:
        if not self.is_configured():
            raise RuntimeError("BOT_WEBAPP_BASE_URL is not configured")

        url = f"{self._base}/webapp/api/story?story_id={story_id}"
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as resp:
                resp.raise_for_status()
                data = await resp.json(content_type=None)
                if not data.get("ok") or not data.get("story"):
                    return None
                return data["story"]
