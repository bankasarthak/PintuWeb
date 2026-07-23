"""Build ComfyUI WAN 2.2 I2V workflows for the shared job queue."""

from __future__ import annotations

import os
from typing import Any

from app.i2v_constants import INPUT_IMAGE_PLACEHOLDER
from app.i2v_template import I2VTemplate

CHECKPOINT_HIGH = "wan22EnhancedNSFWSVICamera_nsfwFASTMOVEV2Q8H.gguf"
CHECKPOINT_LOW = "wan22EnhancedNSFWSVICamera_nsfwFASTMOVEV2Q8L.gguf"
CLIP_MODEL = "umt5_xxl_fp8_e4m3fn_scaled.safetensors"
VAE_MODEL = "wan_2.1_vae.safetensors"
CLIP_VISION = "clip_vision_h.safetensors"


def _wan_workflow_core(
    template: I2VTemplate,
    input_image_name: str,
    image_width: int,
    image_height: int,
    *,
    num_frames: int,
    single_unet: bool = False,
) -> dict[str, Any]:
    aspect = image_width / image_height
    if aspect >= 1.3:
        vid_width, vid_height = 832, 480
    elif aspect <= 0.77:
        vid_width, vid_height = 480, 832
    else:
        vid_width, vid_height = 624, 624

    seed = int.from_bytes(os.urandom(4), "big")
    total_steps = template.num_inference_steps
    high_steps = 2
    high_model_ref: list[str | int] = ["unet_high", 0]

    workflow: dict[str, Any] = {
        "clip": {
            "class_type": "CLIPLoader",
            "inputs": {"clip_name": CLIP_MODEL, "type": "wan"},
        },
        "vae": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": VAE_MODEL},
        },
        "clip_vision_loader": {
            "class_type": "CLIPVisionLoader",
            "inputs": {"clip_name": CLIP_VISION},
        },
        "load_image": {
            "class_type": "LoadImage",
            "inputs": {"image": input_image_name},
        },
        "clip_vision_encode": {
            "class_type": "CLIPVisionEncode",
            "inputs": {
                "clip_vision": ["clip_vision_loader", 0],
                "image": ["load_image", 0],
                "crop": "none",
            },
        },
        "positive": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": template.prompt, "clip": ["clip", 0]},
        },
        "negative": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": template.negative_prompt, "clip": ["clip", 0]},
        },
        "wan_i2v": {
            "class_type": "WanImageToVideo",
            "inputs": {
                "width": vid_width,
                "height": vid_height,
                "length": num_frames,
                "batch_size": 1,
                "positive": ["positive", 0],
                "negative": ["negative", 0],
                "vae": ["vae", 0],
                "clip_vision_output": ["clip_vision_encode", 0],
                "start_image": ["load_image", 0],
            },
        },
        "unet_high": {
            "class_type": "UnetLoaderGGUF",
            "inputs": {"unet_name": CHECKPOINT_HIGH},
        },
    }

    if single_unet:
        workflow["sampler_high"] = {
            "class_type": "KSamplerAdvanced",
            "inputs": {
                "add_noise": "enable",
                "noise_seed": seed,
                "steps": total_steps,
                "cfg": template.guidance_scale,
                "sampler_name": "euler",
                "scheduler": "beta",
                "start_at_step": 0,
                "end_at_step": 10000,
                "return_with_leftover_noise": "disable",
                "model": high_model_ref,
                "positive": ["wan_i2v", 0],
                "negative": ["wan_i2v", 1],
                "latent_image": ["wan_i2v", 2],
            },
        }
        final_latent_ref: list[str | int] = ["sampler_high", 0]
    else:
        low_model_ref: list[str | int] = ["unet_low", 0]
        workflow["sampler_high"] = {
            "class_type": "KSamplerAdvanced",
            "inputs": {
                "add_noise": "enable",
                "noise_seed": seed,
                "steps": total_steps,
                "cfg": template.guidance_scale,
                "sampler_name": "euler",
                "scheduler": "beta",
                "start_at_step": 0,
                "end_at_step": high_steps,
                "return_with_leftover_noise": "enable",
                "model": high_model_ref,
                "positive": ["wan_i2v", 0],
                "negative": ["wan_i2v", 1],
                "latent_image": ["wan_i2v", 2],
            },
        }
        workflow["unet_low"] = {
            "class_type": "UnetLoaderGGUF",
            "inputs": {"unet_name": CHECKPOINT_LOW},
        }
        workflow["sampler_low"] = {
            "class_type": "KSamplerAdvanced",
            "inputs": {
                "add_noise": "disable",
                "noise_seed": seed,
                "steps": total_steps,
                "cfg": template.guidance_scale,
                "sampler_name": "euler",
                "scheduler": "beta",
                "start_at_step": high_steps,
                "end_at_step": 10000,
                "return_with_leftover_noise": "disable",
                "model": low_model_ref,
                "positive": ["wan_i2v", 0],
                "negative": ["wan_i2v", 1],
                "latent_image": ["sampler_high", 0],
            },
        }
        final_latent_ref = ["sampler_low", 0]

    workflow["vae_decode"] = {
        "class_type": "VAEDecode",
        "inputs": {
            "samples": final_latent_ref,
            "vae": ["vae", 0],
        },
    }

    high_model_ref = ["unet_high", 0]
    if template.scene_lora_high:
        workflow["scene_lora_high"] = {
            "class_type": "LoraLoaderModelOnly",
            "inputs": {
                "model": high_model_ref,
                "lora_name": template.scene_lora_high,
                "strength_model": template.scene_lora_high_strength,
            },
        }
        high_model_ref = ["scene_lora_high", 0]

    if template.lora_high:
        workflow["lora_high"] = {
            "class_type": "LoraLoaderModelOnly",
            "inputs": {
                "model": high_model_ref,
                "lora_name": template.lora_high,
                "strength_model": template.lora_high_strength,
            },
        }
        high_model_ref = ["lora_high", 0]

    if template.expr_lora_high:
        workflow["expr_lora_high"] = {
            "class_type": "LoraLoaderModelOnly",
            "inputs": {
                "model": high_model_ref,
                "lora_name": template.expr_lora_high,
                "strength_model": template.expr_lora_high_strength,
            },
        }
        high_model_ref = ["expr_lora_high", 0]

    workflow["sampler_high"]["inputs"]["model"] = high_model_ref

    if not single_unet:
        low_model_ref = ["unet_low", 0]
        if template.scene_lora_low:
            workflow["scene_lora_low"] = {
                "class_type": "LoraLoaderModelOnly",
                "inputs": {
                    "model": low_model_ref,
                    "lora_name": template.scene_lora_low,
                    "strength_model": template.scene_lora_low_strength,
                },
            }
            low_model_ref = ["scene_lora_low", 0]

        if template.lora_low:
            workflow["lora_low"] = {
                "class_type": "LoraLoaderModelOnly",
                "inputs": {
                    "model": low_model_ref,
                    "lora_name": template.lora_low,
                    "strength_model": template.lora_low_strength,
                },
            }
            low_model_ref = ["lora_low", 0]

        if template.expr_lora_low:
            workflow["expr_lora_low"] = {
                "class_type": "LoraLoaderModelOnly",
                "inputs": {
                    "model": low_model_ref,
                    "lora_name": template.expr_lora_low,
                    "strength_model": template.expr_lora_low_strength,
                },
            }
            low_model_ref = ["expr_lora_low", 0]

        workflow["sampler_low"]["inputs"]["model"] = low_model_ref

    return workflow


def build_i2v_workflow(
    template: I2VTemplate,
    image_width: int,
    image_height: int,
    *,
    single_unet: bool = False,
) -> dict[str, Any]:
    workflow = _wan_workflow_core(
        template,
        INPUT_IMAGE_PLACEHOLDER,
        image_width,
        image_height,
        num_frames=template.num_frames,
        single_unet=single_unet,
    )
    workflow["output"] = {
        "class_type": "VHS_VideoCombine",
        "inputs": {
            "frame_rate": template.fps,
            "loop_count": 0,
            "filename_prefix": "pintu",
            "format": "video/h264-mp4",
            "pingpong": False,
            "save_output": True,
            "images": ["vae_decode", 0],
        },
    }
    return workflow
