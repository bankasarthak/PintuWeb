from __future__ import annotations

import logging

import aiohttp

from app.core.exceptions import ServiceError

logger = logging.getLogger(__name__)

CHAT_OPTIONS: dict = {
    "temperature": 0.7,
    "top_p": 0.8,
    "top_k": 20,
    "num_predict": 400,
}
PROMPT_OPTIONS: dict = {
    "temperature": 0.5,
    "top_p": 0.9,
    "top_k": 20,
    "num_predict": 900,
}


class LLMClient:
    def __init__(self, base_url: str, model: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model

    async def complete(
        self,
        messages: list[dict],
        options: dict | None = None,
        timeout: int = 120,
    ) -> str:
        payload = {
            "model": self._model,
            "messages": messages,
            "stream": False,
            "think": False,
            "options": options or CHAT_OPTIONS,
        }

        timeout_obj = aiohttp.ClientTimeout(total=timeout)
        try:
            async with aiohttp.ClientSession(timeout=timeout_obj) as session:
                async with session.post(
                    f"{self._base_url}/api/chat",
                    json=payload,
                ) as resp:
                    if resp.status != 200:
                        body = await resp.text()
                        logger.error(
                            "LLM returned HTTP %s: %s", resp.status, body[:200]
                        )
                        raise ServiceError(
                            f"LLM service returned status {resp.status}"
                        )
                    try:
                        data = await resp.json(content_type=None)
                    except Exception:
                        raw = await resp.text()
                        logger.error("LLM response not valid JSON: %s", raw[:200])
                        raise ServiceError("LLM returned non-JSON response")

        except ServiceError:
            raise
        except aiohttp.ServerTimeoutError:
            logger.error("LLM request timed out after %ss", timeout)
            raise ServiceError("LLM request timed out")
        except aiohttp.ClientConnectionError as exc:
            logger.error("LLM connection error: %s", exc)
            raise ServiceError("Could not connect to LLM service")
        except aiohttp.ClientError as exc:
            logger.exception("Unexpected aiohttp error: %s", exc)
            raise ServiceError("LLM request failed")

        try:
            content: str = data["message"]["content"]
        except (KeyError, TypeError) as exc:
            logger.error("Unexpected LLM response shape: %s", data)
            raise ServiceError("Unexpected response format from LLM") from exc

        return content

    async def health_check(self) -> bool:
        try:
            timeout = aiohttp.ClientTimeout(total=5)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{self._base_url}/") as resp:
                    return resp.status == 200
        except Exception:
            return False
