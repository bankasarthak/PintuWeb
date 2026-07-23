from __future__ import annotations

import json
import logging
import re

from app.core.exceptions import ServiceError
from app.i2v_lora_catalog import normalize_lora_id
from app.services.llm_client import LLMClient, PROMPT_OPTIONS
from app.services.system_prompt_builder import build_i2v_prompt_enhancement_system_prompt

logger = logging.getLogger(__name__)

# User named a literal animal — output must not swap in man/human.
_ANIMAL_SPECIES_RE = re.compile(
    r"\b(dog|dogs|puppy|puppies|canine|canines|horse|horses|equine|stallion|mare|"
    r"bull|bulls|cow|cows|pig|pigs|boar|animal|animals|beast|beasts|zoophil\w*)\b",
    re.IGNORECASE,
)
_HUMAN_PARTNER_RE = re.compile(
    r"\b(man|men|guy|guys|male|males|human|humans|boy|boys|husband|stranger|strangers)\b",
    re.IGNORECASE,
)
_HUMAN_DOGGY_TRIGGER_RE = re.compile(r"\bd0gg1e\b", re.IGNORECASE)


def _user_requests_literal_animal(user_prompt: str) -> bool:
    return bool(_ANIMAL_SPECIES_RE.search(user_prompt))


def _output_betrayed_animal_intent(user_prompt: str, enhanced_prompt: str) -> bool:
    """True when user asked for an animal but the model substituted a human partner."""
    if not _user_requests_literal_animal(user_prompt):
        return False
    out = enhanced_prompt.lower()
    if _ANIMAL_SPECIES_RE.search(out):
        return False
    if _HUMAN_PARTNER_RE.search(out) or _HUMAN_DOGGY_TRIGGER_RE.search(out):
        return True
    return False


_ANIMAL_RETRY_USER_SUFFIX = (
    "\n\nCRITICAL: The user requested a LITERAL ANIMAL (not a human man). "
    "Keep the exact animal species they named. Do NOT use man, male, human, guy, or d0gg1e. "
    'Use lora "none".'
)


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
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ]
        raw = await self._llm.complete(messages, options=PROMPT_OPTIONS)
        result = _parse_enhancement(raw)

        if _output_betrayed_animal_intent(text, result["prompt"]):
            logger.warning(
                "I2V enhancer substituted human for animal — retrying once (input_len=%d)",
                len(text),
            )
            messages.append({"role": "assistant", "content": raw})
            messages.append({"role": "user", "content": text + _ANIMAL_RETRY_USER_SUFFIX})
            raw = await self._llm.complete(messages, options=PROMPT_OPTIONS)
            result = _parse_enhancement(raw)
            if _output_betrayed_animal_intent(text, result["prompt"]):
                raise ServiceError(
                    "Prompt enhancement replaced the requested animal with a human partner"
                )

        logger.info(
            "I2V prompt enhanced via Ollama: input_len=%d output_len=%d lora=%s",
            len(text),
            len(result["prompt"]),
            result["lora"],
        )
        return result
