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
    "scs_missionary",
    "scs_doggy",
    "scs_cowgirl",
    "scs_reverse_cowgirl",
    "scs_spoon",
    "scs_standing",
})

# ids valid for each subject_type — the system prompt only offers the
# subset relevant to whichever photo type the user declared.
LORA_IDS_BY_SUBJECT: dict[str, frozenset[str]] = {
    "solo_woman": frozenset({
        "none", "slap", "pov_missionary", "sexmachine", "doggy_frontview",
        "pov_insertion", "k3nk_deepthroat", "sh00tz",
    }),
    "couple": frozenset({
        "none", "slap", "k3nk_deepthroat", "sh00tz", "full_nelson",
        "scs_missionary", "scs_doggy", "scs_cowgirl", "scs_reverse_cowgirl",
        "scs_spoon", "scs_standing",
    }),
    "multi_women": frozenset({"none", "slap", "k3nk_deepthroat", "sh00tz"}),
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
- pov_missionary — [solo_woman ONLY] first-person POV missionary, camera POV of the man looking
  down at her. Trigger word: m15510n4ry (place only in the action beat).
- sexmachine — [solo_woman ONLY] a mechanical fucking machine thrusts into her vagina or ass.
  Trigger: "sexmachine. thrusts back and forth within. She shakes upon impact."
- doggy_frontview — [solo_woman ONLY] doggystyle from behind but she faces the camera so her face
  and breasts stay visible (the male partner stays mostly out of frame). Trigger: Pl0wView.
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
- scs_missionary — [couple ONLY] the real man and woman from the couple photo in a missionary
  position. Trigger: mqlmis_a.
- scs_doggy — [couple ONLY] the real couple in doggystyle. Trigger: mqldgy_a.
- scs_cowgirl — [couple ONLY] the real couple, woman on top facing him. Trigger: mqlcg_a.
- scs_reverse_cowgirl — [couple ONLY] the real couple, woman on top facing away from him.
  Trigger: mqlrcg_a.
- scs_spoon — [couple ONLY] the real couple lying on their sides, spooning position. Trigger: mqlspn_a.
- scs_standing — [couple ONLY] the real couple having sex standing up. Trigger: mqlstd_a.

Never invent a LoRA id that isn't in this list. Never mention or pick a scene-change LoRA — there
is no scene-change LoRA in this pipeline; scene transitions are handled entirely by the wording of
the 0-3s beat (see GRADUAL TRANSITION rule above). Never use expression/emotion LoRAs.
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
    "scs_missionary": ("mql_missionary_a_v1_high_noise.safetensors", "mql_missionary_a_v1_low_noise.safetensors"),
    "scs_doggy": ("mql_doggy_a_v2_high_noise.safetensors", "mql_doggy_a_v2_low_noise.safetensors"),
    "scs_cowgirl": ("mql_cowgirl_a_v1_high_noise.safetensors", "mql_cowgirl_a_v1_low_noise.safetensors"),
    "scs_reverse_cowgirl": (
        "mql_reverse_cowgirl_a_v1_high_noise.safetensors",
        "mql_reverse_cowgirl_a_v1_low_noise.safetensors",
    ),
    "scs_spoon": ("mql_spoon_a_v2_high_noise.safetensors", "mql_spoon_a_v2_low_noise.safetensors"),
    "scs_standing": ("mql_standing_a_v1_high_noise.safetensors", "mql_standing_a_v1_low_noise.safetensors"),
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
    "scs_missionary": (0.7, 0.6),
    "scs_doggy": (0.7, 0.6),
    "scs_cowgirl": (0.7, 0.6),
    "scs_reverse_cowgirl": (0.7, 0.6),
    "scs_spoon": (0.7, 0.6),
    "scs_standing": (0.7, 0.6),
}

# expr_lora_low genital-rendering assist stacked alongside every scs_* position
# LoRA — matches the validated pattern in admin_registry.py (DR34ML4Y_LOW @ 0.35).
SCS_EXPR_LORA_LOW = "DR34ML4Y_I2V_14B_LOW_V2.safetensors"
SCS_EXPR_LORA_LOW_STRENGTH = 0.35


def normalize_lora_id(lora_id: str, subject_type: str = "solo_woman") -> str:
    """Normalize + validate a lora id, falling back to "none" if it's not
    actually valid for the given subject_type (e.g. model hallucinated
    pov_missionary for a couple photo)."""
    cleaned = lora_id.strip().lower()
    allowed = LORA_IDS_BY_SUBJECT.get(subject_type, I2V_LORA_IDS)
    return cleaned if cleaned in allowed else "none"
