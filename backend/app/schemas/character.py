from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

ALLOWED_BODY_TYPES = {"very_fat", "fat", "normal", "slim", "skinny"}
ALLOWED_SKIN_TONES = {"fair", "light", "medium", "tan", "dark"}
ALLOWED_BREAST_SIZES = {"flat", "small", "medium", "large", "huge"}
ALLOWED_PERSONALITIES = {
    "dominant",
    "submissive",
    "nerdy",
    "sweet",
    "wild",
    "professional",
    "maternal",
}


class CharacterCreate(BaseModel):
    name: str | None = None
    age: int
    body_type: str
    skin_tone: str
    breast_size: str
    personality_type: str = "sweet"

    @field_validator("body_type")
    @classmethod
    def validate_body_type(cls, v: str) -> str:
        if v not in ALLOWED_BODY_TYPES:
            raise ValueError(f"body_type must be one of {ALLOWED_BODY_TYPES}")
        return v

    @field_validator("skin_tone")
    @classmethod
    def validate_skin_tone(cls, v: str) -> str:
        if v not in ALLOWED_SKIN_TONES:
            raise ValueError(f"skin_tone must be one of {ALLOWED_SKIN_TONES}")
        return v

    @field_validator("breast_size")
    @classmethod
    def validate_breast_size(cls, v: str) -> str:
        if v not in ALLOWED_BREAST_SIZES:
            raise ValueError(f"breast_size must be one of {ALLOWED_BREAST_SIZES}")
        return v

    @field_validator("personality_type")
    @classmethod
    def validate_personality(cls, v: str) -> str:
        if v not in ALLOWED_PERSONALITIES:
            raise ValueError(f"personality_type must be one of {ALLOWED_PERSONALITIES}")
        return v


class CharacterUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    body_type: str | None = None
    skin_tone: str | None = None
    breast_size: str | None = None
    personality_type: str | None = None

    @field_validator("body_type")
    @classmethod
    def validate_body_type(cls, v: str | None) -> str | None:
        if v is not None and v not in ALLOWED_BODY_TYPES:
            raise ValueError(f"body_type must be one of {ALLOWED_BODY_TYPES}")
        return v

    @field_validator("skin_tone")
    @classmethod
    def validate_skin_tone(cls, v: str | None) -> str | None:
        if v is not None and v not in ALLOWED_SKIN_TONES:
            raise ValueError(f"skin_tone must be one of {ALLOWED_SKIN_TONES}")
        return v

    @field_validator("breast_size")
    @classmethod
    def validate_breast_size(cls, v: str | None) -> str | None:
        if v is not None and v not in ALLOWED_BREAST_SIZES:
            raise ValueError(f"breast_size must be one of {ALLOWED_BREAST_SIZES}")
        return v

    @field_validator("personality_type")
    @classmethod
    def validate_personality(cls, v: str | None) -> str | None:
        if v is not None and v not in ALLOWED_PERSONALITIES:
            raise ValueError(f"personality_type must be one of {ALLOWED_PERSONALITIES}")
        return v


class CharacterResponse(BaseModel):
    id: uuid.UUID
    name: str | None
    age: int
    body_type: str
    skin_tone: str
    breast_size: str
    personality_type: str
    has_face_image: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj: object) -> "CharacterResponse":
        from app.models.character import Character

        char = obj  # type: ignore[assignment]
        return cls(
            id=char.id,  # type: ignore[attr-defined]
            name=char.name,  # type: ignore[attr-defined]
            age=char.age,  # type: ignore[attr-defined]
            body_type=char.body_type,  # type: ignore[attr-defined]
            skin_tone=char.skin_tone,  # type: ignore[attr-defined]
            breast_size=char.breast_size,  # type: ignore[attr-defined]
            personality_type=char.personality_type,  # type: ignore[attr-defined]
            has_face_image=char.face_image_path is not None,  # type: ignore[attr-defined]
            created_at=char.created_at,  # type: ignore[attr-defined]
        )
