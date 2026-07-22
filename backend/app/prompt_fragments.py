"""Shared I2V prompt fragments for LLM enhancement (mirrors PintuV3 registry constants)."""

SCENE_CHANGE_TRIGGER = "The screen changes to show the new scene."
SOURCE_APPEARANCE_PRESERVE = "hair and hairstyle exactly as source photo"
IDENTITY_ANCHOR = (
    "same woman from source image, identical face and facial features, "
    "same body proportions and physique as source image"
)
FULL_BODY_FRAMING = (
    "full body vertical framing from slightly above head down to upper thighs below knees, "
    "face breasts nipples pussy hips and legs all visible in one frame, pulled-back medium-full body shot"
)
POV_FULL_BODY_FRAMING = (
    "full body first-person POV framing from slightly above her head down to upper thighs below knees, "
    "face breasts nipples spread pussy and legs all visible in one frame, pulled-back medium-full body POV "
    "looking down"
)
SOLO_CAM_HOLD = "same fixed camera angle unchanged no zoom no pan"

I2V_CUSTOM_LOCKED_SHOT = f"fixed camera angle locked pulled-back shot, {FULL_BODY_FRAMING}"
I2V_CUSTOM_POV_LOCKED = f"fixed first-person POV camera angle locked, {POV_FULL_BODY_FRAMING}"
I2V_CUSTOM_SHARP_END = (
    "photorealistic sharp detail, face clearly visible in frame, full body and explicit action "
    "clearly visible, high resolution sharp focus"
)
I2V_CUSTOM_FACE_VISIBLE = "face clearly visible in frame throughout"
