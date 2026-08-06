"""I2V action LoRA catalog for custom prompt enhancement.

Mirrors the validated LoRA set from PintuV3 bot/templates/admin_registry.py —
every id below has a live, user-confirmed-working admin template backing it.
File pairs and strengths MUST stay in sync with bot/services/prompt_enhancer.py
(_LORA_MAP) and bot/templates/registry.py on the PintuV3 side.

Scope column (who each id is valid for):
  solo    — solo_woman photos only (anonymous partner enters frame)
  couple  — couple_photo only (the real man from the source photo)
  any     — usable with solo_woman OR couple_photo
"""

from __future__ import annotations

I2V_LORA_IDS: frozenset[str] = frozenset({
    "none",
    "slap",
    "pov_missionary",
    "sexmachine",
    "doggy_frontview",
    "pov_insertion",
    "k3nk_deepthroat",
    "sh00tz",
    "full_nelson",
    "cuntbusting",
    "lactation",
    "anal_no_boy",
    "blowbang",
    "worship_it",
    "grabbed_by_neck",
    "applying_condom",
    "timefreezes",
    "tongue_extraction",
    "spit_to_viewer",
    "emotional_breakdown",
})

# ids valid for each subject_type — the system prompt only offers the
# subset relevant to whichever photo type the user declared.
LORA_IDS_BY_SUBJECT: dict[str, frozenset[str]] = {
    "solo_woman": frozenset({
        "none", "slap", "pov_missionary", "sexmachine", "doggy_frontview",
        "pov_insertion", "k3nk_deepthroat", "sh00tz",
        "cuntbusting", "lactation", "anal_no_boy", "blowbang", "worship_it",
        "grabbed_by_neck", "applying_condom", "timefreezes", "tongue_extraction",
        "spit_to_viewer", "emotional_breakdown",
    }),
    "couple": frozenset({
        "none", "slap", "k3nk_deepthroat", "sh00tz", "full_nelson",
        "pov_missionary", "doggy_frontview",
    }),
    "multi_women": frozenset({"none", "slap", "k3nk_deepthroat", "sh00tz", "cuntbusting"}),
}

I2V_LORA_CATALOG = """
Available action LoRAs — pick exactly ONE id, or "none":
- none — fondling, groping, posing, kneeling, crawling, bondage/chained display, undressing,
  slapping breasts by hand (no LoRA needed for a bare-hand slap — only use "slap" below for the
  dedicated LoRA look), public humiliation, suspension display, kissing, showering, grinding,
  fingering, mutual fondling; NO penetration, NO fucking-machine, NO blowjob.
- slap — LoRA-driven face slapping or repeated open-hand breast slapping with visible impact/jiggle.
  Trigger language: "slaps her in the face" / "slaps her bare breasts". solo or couple/multi (slap
  one of the other people in frame).
- pov_missionary — [solo_woman OR couple] first-person POV missionary, camera POV of the man looking
  down at her (for couple photos, this is the real man from the source photo). Trigger word:
  m15510n4ry (place only in the action beat).
- sexmachine — [solo_woman ONLY] a mechanical fucking machine thrusts into her vagina or ass.
  Trigger: "sexmachine. thrusts back and forth within. She shakes upon impact."
- doggy_frontview — [solo_woman OR couple] doggystyle from behind but she faces the camera so her
  face and breasts stay visible (for couple photos, the real man from the source photo stays mostly
  out of frame behind her). Trigger: Pl0wView.
- pov_insertion — [solo_woman ONLY] captures the exact moment of penetration (missionary or
  doggystyle) when the penis was not yet visible. No short trigger — write a plain, literal
  description of the insertion moment (no euphemisms).
- k3nk_deepthroat — [solo_woman OR couple] blowjob / deepthroat / facefuck. No short trigger — this
  LoRA is caption-trained, so write a full descriptive sentence (nose pressed to groin, throat
  bulge, lips wrapped around the base, gagging) instead of a keyword. Avoid 69-position prompts.
- sh00tz — [solo_woman OR couple] cumshot / facial / bukkake finish. Trigger word: sh00tz.
- full_nelson — [couple ONLY] the real man from the couple photo holds her in a full nelson (his
  arms locked behind her neck) while thrusting; his body should stay mostly hidden — only his arms,
  thighs, and penis in frame. Trigger word: fullnelson.
- cuntbusting — [solo_woman OR multi_women] another woman kicks/strikes her directly between the
  legs (crotch kick/knee strike), pain-pleasure reaction. Trigger words: "Cuntbusting, kickbusting".
  For solo_woman, bring an anonymous second woman into frame during the 0-3s beat.
- lactation — [solo_woman ONLY] she squeezes her own breasts and milk sprays/streams from her
  nipples. Trigger word: l4ct4t10n. Use this whenever the idea is breast squeezing + milk/lactation,
  NOT the generic "none" bucket.
- anal_no_boy — [solo_woman ONLY] POV anal penetration from behind with no male body visible in
  frame — only the penis enters from the frame edge. No short trigger, write it literally.
- blowbang — [solo_woman ONLY] one woman services multiple men (roughly 3-4) at once with mouth and
  both hands. Trigger word: bl0wb4ng. Pin the exact head count in the negative-style wording if the
  user specifies one (dataset is trained on ~4 men).
- worship_it — [solo_woman ONLY] slow reverent oral worship of a penis — licking up the shaft,
  kissing the tip, then a deep blowjob. Triggers: cock_worship, cock_lick, cock_slap, titfuck,
  handjob, blowjob, deepthroat (pick whichever phrase matches the idea).
- grabbed_by_neck — [solo_woman ONLY] a disembodied POV hand reaches into frame and grabs her by
  the neck, forcing her down onto her knees. Trigger (full sentence): "First-person perspective, a
  hand from outside reaches out to grab their neck, forcing them to kneel."
- applying_condom — [solo_woman ONLY] she unwraps and rolls a condom onto a man's penis before sex.
  No short trigger — use the full literal description (small round condom, rolls it down the shaft,
  fits tightly, covers the entire penis). Use LOW strength (already set at 0.4) — do not suggest a
  higher strength.
- timefreezes — [solo_woman ONLY] SFW-only helper: everything freezes except a pair of POV hands
  that undress her frozen, unaware body piece by piece. No baked sexual act — pair with plain
  undressing wording only, never with penetration/oral in the same beat.
- tongue_extraction — [solo_woman ONLY] a POV hand reaches in and pulls her extended tongue between
  two fingers, stretching it. No short trigger, write it literally.
- spit_to_viewer — [solo_woman ONLY] she spits directly at/onto the camera lens. Trigger phrase:
  "a woman spitting to the viewer."
- emotional_breakdown — [solo_woman ONLY] SFW-only expression helper for crying/sobbing/panicking —
  NOT a sexual action LoRA. Only pick this for non-sexual emotional-distress ideas (crying, anxiety,
  breakdown) with no nudity/sexual content in the same beat. Triggers: "she breaks down in tears,
  sobbing" / "she panics, fretting anxiously" / "she cries out in pain".

Never invent a LoRA id that isn't in this list. Never mention or pick a scene-change LoRA — there
is no scene-change LoRA in this pipeline; scene transitions are handled entirely by the wording of
the 0-3s beat (see GRADUAL TRANSITION rule above). Never use expression/emotion LoRAs (timefreezes,
emotional_breakdown) for a beat that also contains nudity or a sexual act — those two ids are SFW
helpers only.
"""

# Maps lora id → (high_filename, low_filename). NOTE: kept as a 2-tuple —
# app/services/generate_service.py and app/services/i2v_job_builder.py (the
# PintuWeb *website's own* i2v_custom job pipeline, separate from the
# PintuV3 Telegram bot's) unpack this as `high, low = I2V_LORA_FILES.get(...)`.
# Strengths for the new ids live in I2V_LORA_STRENGTHS below instead of
# changing this tuple's shape.
I2V_LORA_FILES: dict[str, tuple[str | None, str | None]] = {
    "none": (None, None),
    "slap": ("wan_2.2_i2v_slap_high_v2.0.safetensors", "wan_2.2_i2v_slap_low_v2.0.safetensors"),
    "pov_missionary": (
        "wan2.2_i2v_highnoise_pov_missionary_v1.0.safetensors",
        "wan2.2_i2v_lownoise_pov_missionary_v1.0.safetensors",
    ),
    "sexmachine": ("sexmachine-shura-000003.safetensors", "sexmachine-shura-000003.safetensors"),
    "doggy_frontview": ("front_doggy_plow_v1_1_wan.safetensors", "front_doggy_plow_v1_1_wan.safetensors"),
    "pov_insertion": (
        "wan2.2-i2v-high-pov-insertion-v1.0.safetensors",
        "wan2.2-i2v-low-pov-insertion-v1.0.safetensors",
    ),
    "k3nk_deepthroat": (
        "wan22-ultimatedeepthroat-i2v-102epoc-high-k3nk.safetensors",
        "wan22-ultimatedeepthroat-I2V-101epoc-low-k3nk.safetensors",
    ),
    "sh00tz": ("sh00tz_HN_75.safetensors", "sh00tz_LN_75.safetensors"),
    "full_nelson": ("fullnelson_v1_e80_wan.safetensors", "fullnelson_v1_e80_wan.safetensors"),
    "cuntbusting": ("Wan22_Cuntbusting_I2V_v1_high_noise.safetensors", "Wan22_Cuntbusting_I2V_v1_low_noise.safetensors"),
    "lactation": ("Wan22_I2V_lactation_high_noise.safetensors", "Wan22_I2V_lactation_low_noise.safetensors"),
    "anal_no_boy": ("anal_no_boy_high_noise.safetensors", "anal_no_boy_low_noise.safetensors"),
    "blowbang": ("bl0wb4ng_v2_HN.safetensors", "bl0wb4ng_v2_LN.safetensors"),
    "worship_it": ("worship_it_i2v_high_noise.safetensors", "worship_it_i2v_low_noise.safetensors"),
    "grabbed_by_neck": ("grabbed_by_neck_high_noise.safetensors", "grabbed_by_neck_low_noise.safetensors"),
    "applying_condom": ("applying_condom_high_noise.safetensors", "applying_condom_low_noise.safetensors"),
    "timefreezes": ("timefreezes_i2v_high_noise.safetensors", None),
    "tongue_extraction": ("tongue_extraction_high_noise.safetensors", "tongue_extraction_low_noise.safetensors"),
    "spit_to_viewer": ("spit_to_viewer_high_noise.safetensors", "spit_to_viewer_low_noise.safetensors"),
    "emotional_breakdown": ("emotional_breakdown_high_noise.safetensors", "emotional_breakdown_low_noise.safetensors"),
}

# lora id → (high_strength, low_strength) — matches the validated strengths in
# PintuV3 bot/templates/admin_registry.py. Not yet consumed by the website's
# own job builder (which currently applies dataclass defaults uniformly);
# kept here so it's available once that's wired up, and so PintuV3's bot-side
# _LORA_MAP has a single source of truth to mirror.
I2V_LORA_STRENGTHS: dict[str, tuple[float, float]] = {
    "none": (0.0, 0.0),
    "slap": (0.55, 0.55),
    "pov_missionary": (0.6, 0.6),
    "sexmachine": (0.7, 0.7),
    "doggy_frontview": (0.7, 0.7),
    "pov_insertion": (0.6, 0.6),
    "k3nk_deepthroat": (0.6, 0.6),
    "sh00tz": (0.7, 0.7),
    "full_nelson": (0.7, 0.7),
    "cuntbusting": (0.7, 0.7),
    "lactation": (0.7, 0.7),
    "anal_no_boy": (0.7, 0.7),
    "blowbang": (0.7, 0.7),
    "worship_it": (0.7, 0.7),
    "grabbed_by_neck": (0.7, 0.7),
    "applying_condom": (0.4, 0.4),
    "timefreezes": (0.9, 0.0),
    "tongue_extraction": (0.7, 0.7),
    "spit_to_viewer": (0.7, 0.7),
    "emotional_breakdown": (0.7, 0.7),
}


def normalize_lora_id(lora_id: str, subject_type: str = "solo_woman") -> str:
    """Normalize + validate a lora id, falling back to "none" if it's not
    actually valid for the given subject_type (e.g. model hallucinated
    pov_missionary for a couple photo)."""
    cleaned = lora_id.strip().lower()
    allowed = LORA_IDS_BY_SUBJECT.get(subject_type, I2V_LORA_IDS)
    return cleaned if cleaned in allowed else "none"
