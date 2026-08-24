"""WAN I2V constants — kept in sync with PintuV3 bot/templates/registry.py."""

from __future__ import annotations

SCENE_CHANGE_HIGH = "scene_change_nsfw_v1.0_high_noise.safetensors"
SCENE_CHANGE_LOW = "scene_change_nsfw_v1.0_low_noise.safetensors"
SLAP_HIGH = "wan_2.2_i2v_slap_high_v2.0.safetensors"
SLAP_LOW = "wan_2.2_i2v_slap_low_v2.0.safetensors"

DEFAULT_FPS = 24
DEFAULT_NUM_FRAMES = 105

I2V_CUSTOM_NEGATIVE = (
    "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，"
    "JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，"
    "手指融合，静止不动的画面，杂乱的背景，三条腿，倒着走, censored, mosaic censoring, bar censor, "
    "pixelated, glowing, bloom, blurry, out of focus, low detail, bad anatomy, ugly, overexposed, underexposed, "
    "distorted face, extra limbs, cartoonish, 3d render artifacts, unnatural lighting, bad composition, "
    "missing shadows, low resolution, poorly textured, glitch, noise, grain, static, motionless, still frame, "
    "worst quality, low quality, JPEG compression artifacts, subtitles, stylized, artwork, painting, "
    "illustration, three legs, walking backward, unnatural skin tone, poorly drawn hands, extra fingers, "
    "fused fingers, poorly drawn face, deformed, disfigured, malformed limbs, "
    "wrong physics, unnatural motion, rubbery skin, plastic skin, morphing body, melting face, body warp, "
    "bad video quality, soft focus, compressed video, muddy details, washed out, temporal flicker, ghosting, "
    "motion smear, motion blur, shaky warp, identity drift, face morph, fused bodies, merged limbs, "
    "fast motion, rushed motion, sped up, shaking in place, vibrating without displacement, "
    "jittery motion, juddering, micro-shake, stationary tremor, twitching in place, "
    "oscillating without moving, motion glitch, stuttering motion, frozen in place with tremor"
)

INPUT_IMAGE_PLACEHOLDER = "__PINTU_INPUT__"
I2V_POD_TARGET = "i2v_1"
