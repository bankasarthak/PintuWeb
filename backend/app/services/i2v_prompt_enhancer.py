from __future__ import annotations

import json
import logging
import re

from app.core.exceptions import ServiceError
from app.i2v_lora_catalog import normalize_lora_id
from app.services.llm_client import LLMClient, PROMPT_OPTIONS
from app.services.system_prompt_builder import build_i2v_prompt_enhancement_system_prompt

logger = logging.getLogger(__name__)


def _strip_wrapping(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:\w+)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()
    return text


def _parse_enhancement(raw: str) -> dict[str, str]:
    cleaned = _strip_wrapping(raw)
    if not cleaned:
        raise ServiceError("LLM returned an empty I2V prompt")

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            prompt = str(parsed.get("prompt", "")).strip()
            lora = normalize_lora_id(str(parsed.get("lora", "none")))
            if prompt:
                return {"prompt": prompt, "lora": lora}
    except json.JSONDecodeError:
        pass

    # Fallback: plain-text prompt (legacy LLM output)
    if cleaned.startswith("(at ") or "(at 0" in cleaned[:80]:
        return {"prompt": cleaned, "lora": "none"}

    raise ServiceError("LLM returned an invalid I2V enhancement response")


class I2VPromptEnhancerService:
    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    async def enhance(self, user_prompt: str) -> dict[str, str]:
        text = user_prompt.strip()
        if not text:
            raise ServiceError("user_prompt cannot be empty")

        system_prompt = build_i2v_prompt_enhancement_system_prompt()
        raw = await self._llm.complete(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            options=PROMPT_OPTIONS,
        )
        result = _parse_enhancement(raw)
        logger.info(
            "I2V prompt enhanced via Ollama: input_len=%d output_len=%d lora=%s",
            len(text),
            len(result["prompt"]),
            result["lora"],
        )
        return result
