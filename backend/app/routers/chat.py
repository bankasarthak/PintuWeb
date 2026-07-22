from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import ConflictError
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatResponse,
    CreateSessionRequest,
    MessageResponse,
    SendMessageRequest,
    SessionResponse,
)
from app.schemas.common import PaginatedResponse
from app.services.character_service import CharacterService
from app.services.chat_service import ChatService
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


def _llm() -> LLMClient:
    return LLMClient(base_url=settings.OLLAMA_URL, model=settings.OLLAMA_MODEL)


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    character_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SessionResponse]:
    try:
        svc = ChatService(db=db, llm=_llm(), settings=settings)
        sessions = await svc.list_sessions(current_user.id, character_id)
        return [SessionResponse.model_validate(s) for s in sessions]
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error listing sessions for user %s", current_user.id)
        raise


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    req: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    try:
        char_svc = CharacterService(db)
        await char_svc.get_character(current_user.id, req.character_id)

        svc = ChatService(db=db, llm=_llm(), settings=settings)
        session = await svc.create_session(current_user.id, req.character_id, req.title)
        return SessionResponse.model_validate(session)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error creating session for user %s", current_user.id)
        raise


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        svc = ChatService(db=db, llm=_llm(), settings=settings)
        await svc.delete_session(current_user.id, session_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error deleting session %s", session_id)
        raise


@router.get(
    "/sessions/{session_id}/messages",
    response_model=PaginatedResponse[MessageResponse],
)
async def list_messages(
    session_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[MessageResponse]:
    try:
        svc = ChatService(db=db, llm=_llm(), settings=settings)
        messages, total = await svc.list_messages(
            current_user.id, session_id, page, per_page
        )
        return PaginatedResponse(
            items=[MessageResponse.model_validate(m) for m in messages],
            total=total,
            page=page,
            per_page=per_page,
            has_next=(page * per_page) < total,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error listing messages for session %s", session_id)
        raise


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    session_id: uuid.UUID,
    req: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    try:
        chat_svc = ChatService(db=db, llm=_llm(), settings=settings)
        session = await chat_svc.get_session(current_user.id, session_id)

        char_svc = CharacterService(db)
        character = await char_svc.get_character(current_user.id, session.character_id)

        updated_session, assistant_msg = await chat_svc.send_message(
            current_user.id, session_id, req.content, character
        )
        return ChatResponse(
            session=SessionResponse.model_validate(updated_session),
            message=MessageResponse.model_validate(assistant_msg),
        )
    except ConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": "insufficient_credits", "message": str(exc)},
        ) from exc
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error sending message in session %s", session_id)
        raise
