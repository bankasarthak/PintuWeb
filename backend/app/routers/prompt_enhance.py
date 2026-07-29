from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

from app.config import settings
from app.dependencies import verify_service_token
from app.schemas.prompt_enhance import I2VPromptEnhanceRequest, I2VPromptEnhanceResponse
from app.services.i2v_prompt_enhancer import I2VPromptEnhancerService
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prompt", tags=["prompt"])


def _llm() -> LLMClient:
    return LLMClient(base_url=settings.OLLAMA_URL, model=settings.OLLAMA_MODEL)


@router.post(
    "/i2v-enhance",
    response_model=I2VPromptEnhanceResponse,
    dependencies=[Depends(verify_service_token)],
)
async def i2v_prompt_enhancement(body: I2VPromptEnhanceRequest) -> I2VPromptEnhanceResponse:
    """Enhance a short user I2V idea into a gradual-transition (0-3s/3-5s) prompt via Ollama."""
    service = I2VPromptEnhancerService(_llm())
    result = await service.enhance(body.user_prompt, subject_type=body.subject_type)
    logger.info(
        "I2V prompt enhancement OK: input_len=%d output_len=%d lora=%s subject_type=%s",
        len(body.user_prompt),
        len(result["prompt"]),
        result["lora"],
        body.subject_type,
    )
    return I2VPromptEnhanceResponse(enhanced_prompt=result["prompt"], lora=result["lora"])
