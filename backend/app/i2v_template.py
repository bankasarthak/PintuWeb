"""Minimal I2V template model for ComfyUI workflow building."""

from __future__ import annotations

from dataclasses import dataclass, replace

from app.i2v_constants import (
    DEFAULT_FPS,
    DEFAULT_NUM_FRAMES,
    I2V_CUSTOM_NEGATIVE,
    SCENE_CHANGE_HIGH,
    SCENE_CHANGE_LOW,
)


@dataclass(frozen=True)
class I2VTemplate:
    id: str
    prompt: str
    negative_prompt: str
    guidance_scale: float
    num_inference_steps: int
    num_frames: int
    fps: int
    scene_lora_high: str | None = None
    scene_lora_low: str | None = None
    scene_lora_high_strength: float = 0.8
    scene_lora_low_strength: float = 0.8
    lora_high: str | None = None
    lora_low: str | None = None
    lora_high_strength: float = 0.8
    lora_low_strength: float = 0.8
    expr_lora_high: str | None = None
    expr_lora_low: str | None = None
    expr_lora_high_strength: float = 0.5
    expr_lora_low_strength: float = 1.0


def base_i2v_custom_template() -> I2VTemplate:
    return I2VTemplate(
        id="i2v_custom",
        prompt="__CUSTOM__",
        negative_prompt=I2V_CUSTOM_NEGATIVE,
        guidance_scale=1.0,
        num_inference_steps=6,
        num_frames=DEFAULT_NUM_FRAMES,
        fps=DEFAULT_FPS,
    )


def with_prompt_and_loras(
    template: I2VTemplate,
    *,
    prompt: str,
    lora_high: str | None = None,
    lora_low: str | None = None,
) -> I2VTemplate:
    return replace(
        template,
        prompt=prompt,
        scene_lora_high=SCENE_CHANGE_HIGH,
        scene_lora_low=SCENE_CHANGE_LOW,
        lora_high=lora_high,
        lora_low=lora_low,
    )
