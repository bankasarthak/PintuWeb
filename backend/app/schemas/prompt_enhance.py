from __future__ import annotations

from pydantic import BaseModel, field_validator


class I2VPromptEnhanceRequest(BaseModel):
    user_prompt: str

    @field_validator("user_prompt")
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("user_prompt cannot be empty")
        if len(stripped) > 2000:
            raise ValueError("user_prompt must be at most 2000 characters")
        return stripped


class I2VPromptEnhanceResponse(BaseModel):
    enhanced_prompt: str
    lora: str = "none"
