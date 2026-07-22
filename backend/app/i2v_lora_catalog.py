"""I2V action LoRA catalog for custom prompt enhancement."""

from __future__ import annotations

I2V_LORA_IDS: frozenset[str] = frozenset({
    "none",
    "dr34ml4y_doggy",
    "dr34ml4y_oral",
    "dr34ml4y_missionary",
    "dr34ml4y_prone",
    "pov_missionary",
    "slap",
    "sexmachine",
})

I2V_LORA_CATALOG = """
Available action LoRAs — pick exactly ONE id:
- none — fondling, groping, posing, kneeling, crawling, bondage display, undressing, public humiliation, suspension display; NO penetration
- dr34ml4y_doggy — doggystyle / from behind. Trigger word: d0gg1e (weave into action beat 2-3 only, NOT in setup)
- dr34ml4y_oral — blowjob / deepthroat. Trigger words: bl0wj0b or f4c3fck
- dr34ml4y_missionary — missionary vaginal. Trigger word: m15510n4ry
- dr34ml4y_prone — prone bone face-down on bed. Trigger word: pr0ne
- pov_missionary — POV top-down missionary. Trigger: m15510n4ry + first-person POV framing
- slap — face slapping or whip on breasts/body. Trigger: "she is slapped in the face," or whip strike on bare breasts
- sexmachine — fucking machine / dildo machine. Trigger: "sexmachine. thrusts back and forth within. She shakes upon impact."

Scene-change LoRA is attached automatically by the pipeline — never mention or pick it.
Never use expression/emotion LoRAs.
"""

# Maps lora id → (high_filename, low_filename) — must stay in sync with bot registry.
I2V_LORA_FILES: dict[str, tuple[str | None, str | None]] = {
    "none": (None, None),
    "dr34ml4y_doggy": ("DR34ML4Y_I2V_14B_HIGH_V2.safetensors", "DR34ML4Y_I2V_14B_LOW_V2.safetensors"),
    "dr34ml4y_oral": ("DR34ML4Y_I2V_14B_HIGH_V2.safetensors", "DR34ML4Y_I2V_14B_LOW_V2.safetensors"),
    "dr34ml4y_missionary": ("DR34ML4Y_I2V_14B_HIGH_V2.safetensors", "DR34ML4Y_I2V_14B_LOW_V2.safetensors"),
    "dr34ml4y_prone": ("DR34ML4Y_I2V_14B_HIGH_V2.safetensors", "DR34ML4Y_I2V_14B_LOW_V2.safetensors"),
    "pov_missionary": (
        "wan2.2_i2v_highnoise_pov_missionary_v1.0.safetensors",
        "wan2.2_i2v_lownoise_pov_missionary_v1.0.safetensors",
    ),
    "slap": ("wan_2.2_i2v_slap_high_v2.0.safetensors", "wan_2.2_i2v_slap_low_v2.0.safetensors"),
    "sexmachine": ("sexmachine-shura-000003.safetensors", "sexmachine-shura-000003.safetensors"),
}


def normalize_lora_id(lora_id: str) -> str:
    cleaned = lora_id.strip().lower()
    return cleaned if cleaned in I2V_LORA_IDS else "none"
