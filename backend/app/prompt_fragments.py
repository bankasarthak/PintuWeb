"""Shared I2V prompt fragments for LLM enhancement (mirrors PintuV3 registry constants).

NOTE: as of the "gradual transition" rewrite, the enhancer no longer uses
SCENE_CHANGE_TRIGGER / abrupt jumpcuts (kept below only so nothing else that
still imports it breaks) — see PintuV3 bot/templates/admin_registry.py for
the validated gradual (0-2.5s phase-in / 2.5-4s action, or continuous 0-4s
for no-scene-change actions) style this now mirrors.
"""

SCENE_CHANGE_TRIGGER = "The screen changes to show the new scene."
SOURCE_APPEARANCE_PRESERVE = "hair and hairstyle exactly as source photo"
IDENTITY_ANCHOR = (
    "same woman from source image, identical face and facial features, "
    "same body type and proportions as the source photo"
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
SHARP_DETAIL = "photorealistic sharp detail, high resolution sharp focus"

# ── Couple-photo fragments (mirrors PintuV3 registry.py COUPLE_*) ──────────
COUPLE_IDENTITY = (
    "same woman and man from source couple image, identical faces and facial features from source photo, "
    "same body proportions and physique as source photo"
)
COUPLE_FACE_DETAIL = (
    "sharp detailed faces, both faces clearly visible and in focus, identical faces unchanged from source photo, "
    "natural cheek volume, high facial detail, photorealistic skin pores"
)
COUPLE_FULL_BODY = (
    "full body vertical framing from slightly above head down to feet on floor, face breasts hips and legs all "
    "visible in one frame, pulled-back full body shot facing camera not zoomed out"
)

# ── Multi-women-photo fragments (mirrors PintuV3 registry.py DUO_WOMEN_*) ──
DUO_WOMEN_IDENTITY = (
    "the women from source duo image, each with identical face and facial features from source photo, "
    "distinct women side by side, same body type and proportions as each woman's own source photo"
)
DUO_WOMEN_FACE_DETAIL = COUPLE_FACE_DETAIL
DUO_WOMEN_FULL_BODY = COUPLE_FULL_BODY

GRADUAL_NO_JUMPCUT = (
    "camera angle unchanged throughout, no jump cut, no sudden scene switch"
)
