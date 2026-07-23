"""Build I2V job_params (ComfyUI workflow + LoRAs) for website jobs — mirrors Telegram shared_generate."""

from __future__ import annotations

import logging
import re

from app.i2v_constants import I2V_POD_TARGET, SLAP_HIGH, SLAP_LOW
from app.i2v_lora_catalog import I2V_LORA_FILES, normalize_lora_id
from app.i2v_template import I2VTemplate, base_i2v_custom_template, with_prompt_and_loras
from app.services.comfyui_workflow import build_i2v_workflow

logger = logging.getLogger(__name__)

_SLAP_HIT_RE = re.compile(r"\b(?:hit|hits|hitting)\b", re.IGNORECASE)


def _custom_prompt_wants_slap(*prompts: str) -> bool:
    for prompt in prompts:
        low = prompt.lower()
        if "slap" in low:
            return True
        if _SLAP_HIT_RE.search(prompt):
            return True
    return False


def _resolve_action_lora(
    lora_id: str | None,
    raw_user_prompt: str,
    final_prompt: str,
) -> tuple[str | None, str | None]:
    chosen = normalize_lora_id(lora_id or "none")
    if chosen != "none":
        high, low = I2V_LORA_FILES.get(chosen, (None, None))
        if high and low:
            logger.info("I2V custom: LoRA from enhancer: %s", chosen)
            return high, low

    if _custom_prompt_wants_slap(raw_user_prompt, final_prompt):
        logger.info("I2V custom: slap LoRA attached (keyword fallback)")
        return SLAP_HIGH, SLAP_LOW

    return None, None


def build_i2v_custom_template(
    final_prompt: str,
    raw_user_prompt: str = "",
    *,
    lora_id: str | None = None,
) -> I2VTemplate:
    lora_high, lora_low = _resolve_action_lora(lora_id, raw_user_prompt, final_prompt)
    template = with_prompt_and_loras(
        base_i2v_custom_template(),
        prompt=final_prompt.strip(),
        lora_high=lora_high,
        lora_low=lora_low,
    )
    logger.info("I2V custom: scene change LoRA attached")
    return template


def template_lora_job_params(template: I2VTemplate) -> dict:
    """Serialize template LoRA + generation settings for job_params audit."""
    return {
        "template_id": template.id,
        "guidance_scale": template.guidance_scale,
        "num_inference_steps": template.num_inference_steps,
        "num_frames": template.num_frames,
        "fps": template.fps,
        "lora_high": template.lora_high,
        "lora_low": template.lora_low,
        "lora_high_strength": template.lora_high_strength,
        "lora_low_strength": template.lora_low_strength,
        "scene_lora_high": template.scene_lora_high,
        "scene_lora_low": template.scene_lora_low,
        "scene_lora_high_strength": template.scene_lora_high_strength,
        "scene_lora_low_strength": template.scene_lora_low_strength,
        "expr_lora_high": template.expr_lora_high,
        "expr_lora_low": template.expr_lora_low,
        "expr_lora_high_strength": template.expr_lora_high_strength,
        "expr_lora_low_strength": template.expr_lora_low_strength,
    }


def build_i2v_custom_job_params(
    *,
    final_prompt: str,
    raw_user_prompt: str,
    image_width: int,
    image_height: int,
    lora_id: str | None = None,
    pod_target: str = I2V_POD_TARGET,
    single_unet: bool = False,
) -> dict:
    """Return full job_params dict for an i2v_custom website job."""
    template = build_i2v_custom_template(
        final_prompt,
        raw_user_prompt,
        lora_id=lora_id,
    )
    workflow = build_i2v_workflow(
        template, image_width, image_height, single_unet=single_unet
    )
    params = template_lora_job_params(template)
    params["comfyui_workflow"] = workflow
    params["pod_target"] = pod_target
    return params


def single_unet_for_pod(pod_target: str, allowed: str) -> bool:
    """Match bot COMFYUI_SINGLE_UNET semantics."""
    if not allowed.strip():
        return False
    tokens = {t.strip() for t in allowed.replace(",", " ").split() if t.strip()}
    if "*" in tokens or "all" in tokens:
        return True
    return pod_target in tokens
