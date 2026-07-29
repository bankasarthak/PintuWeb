from __future__ import annotations

from pydantic import BaseModel, field_validator

_VALID_SUBJECT_TYPES = {"solo_woman", "couple", "multi_women"}


class I2VPromptEnhanceRequest(BaseModel):
    user_prompt: str
    subject_type: str = "solo_woman"

    @field_validator("user_prompt")
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("user_prompt cannot be empty")
        if len(stripped) > 2000:
            raise ValueError("user_prompt must be at most 2000 characters")
        return stripped

    @field_validator("subject_type")
    @classmethod
    def subject_type_valid(cls, v: str) -> str:
        cleaned = (v or "").strip().lower()
        return cleaned if cleaned in _VALID_SUBJECT_TYPES else "solo_woman"


class I2VPromptEnhanceResponse(BaseModel):
    enhanced_prompt: str
    lora: str = "none"

