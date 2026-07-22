from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class CreateSessionRequest(BaseModel):
    character_id: uuid.UUID
    title: str | None = None


class SessionResponse(BaseModel):
    id: uuid.UUID
    character_id: uuid.UUID
    title: str
    message_count: int
    last_active: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Message content cannot be empty")
        if len(stripped) > 2000:
            raise ValueError("Message content must be at most 2000 characters")
        return stripped


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    session: SessionResponse
    message: MessageResponse
