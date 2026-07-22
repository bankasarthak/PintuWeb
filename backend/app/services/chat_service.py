from __future__ import annotations

import logging
import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.core.exceptions import NotFoundError
from app.models.chat import ChatMessage, ChatSession
from app.models.character import Character
from app.schemas.chat import SessionResponse
from app.services.llm_client import CHAT_OPTIONS, LLMClient
from app.services.system_prompt_builder import build_chat_prompt

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(
        self, db: AsyncSession, llm: LLMClient, settings: Settings
    ) -> None:
        self._db = db
        self._llm = llm
        self._settings = settings

    async def list_sessions(
        self, user_id: uuid.UUID, character_id: uuid.UUID | None = None
    ) -> list[ChatSession]:
        try:
            query = select(ChatSession).where(ChatSession.user_id == user_id)
            if character_id is not None:
                query = query.where(ChatSession.character_id == character_id)
            query = query.order_by(ChatSession.last_active.desc())
            result = await self._db.execute(query)
            return list(result.scalars().all())
        except Exception:
            logger.exception("DB error listing sessions for user %s", user_id)
            raise

    async def create_session(
        self,
        user_id: uuid.UUID,
        character_id: uuid.UUID,
        title: str | None,
    ) -> ChatSession:
        if title is None:
            try:
                count_result = await self._db.execute(
                    select(func.count(ChatSession.id)).where(
                        ChatSession.user_id == user_id,
                        ChatSession.character_id == character_id,
                    )
                )
                count = count_result.scalar_one()
                title = f"Chat {count + 1}"
            except Exception:
                logger.exception("DB error counting sessions")
                raise

        session = ChatSession(
            id=uuid.uuid4(),
            user_id=user_id,
            character_id=character_id,
            title=title,
        )
        self._db.add(session)
        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error creating session")
            raise

        return session

    async def get_session(
        self, user_id: uuid.UUID, session_id: uuid.UUID
    ) -> ChatSession:
        try:
            result = await self._db.execute(
                select(ChatSession).where(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user_id,
                )
            )
            session = result.scalar_one_or_none()
        except Exception:
            logger.exception("DB error fetching session %s", session_id)
            raise

        if session is None:
            raise NotFoundError(f"Chat session {session_id} not found")

        return session

    async def send_message(
        self,
        user_id: uuid.UUID,
        session_id: uuid.UUID,
        content: str,
        character: Character,
    ) -> tuple[ChatSession, ChatMessage]:
        session = await self.get_session(user_id, session_id)

        user_msg = ChatMessage(
            id=uuid.uuid4(),
            session_id=session.id,
            role="user",
            content=content,
        )
        self._db.add(user_msg)

        session.message_count += 1
        session.nudge_counter += 1
        session.last_active = datetime.now(timezone.utc)

        nudge_threshold = random.randint(5, 7)
        should_nudge = session.nudge_counter >= nudge_threshold

        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error saving user message for session %s", session_id)
            raise

        try:
            ctx_result = await self._db.execute(
                select(ChatMessage)
                .where(ChatMessage.session_id == session.id)
                .order_by(ChatMessage.created_at.asc())
                .limit(self._settings.OLLAMA_CHAT_MAX_CONTEXT)
            )
            context_messages = list(ctx_result.scalars().all())
        except Exception:
            logger.exception("DB error fetching context messages for session %s", session_id)
            raise

        system_prompt = build_chat_prompt(character, nudge=should_nudge)
        messages = [{"role": "system", "content": system_prompt}] + [
            {"role": msg.role, "content": msg.content} for msg in context_messages
        ]

        try:
            reply_content = await self._llm.complete(messages, options=CHAT_OPTIONS)
        except Exception:
            logger.exception("LLM error for session %s", session_id)
            raise

        assistant_msg = ChatMessage(
            id=uuid.uuid4(),
            session_id=session.id,
            role="assistant",
            content=reply_content,
        )
        self._db.add(assistant_msg)
        session.message_count += 1

        if should_nudge:
            session.nudge_counter = 0

        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error saving assistant message for session %s", session_id)
            raise

        return session, assistant_msg

    async def delete_session(
        self, user_id: uuid.UUID, session_id: uuid.UUID
    ) -> None:
        session = await self.get_session(user_id, session_id)
        try:
            await self._db.delete(session)
            await self._db.flush()
        except Exception:
            logger.exception("DB error deleting session %s", session_id)
            raise

    async def list_messages(
        self,
        user_id: uuid.UUID,
        session_id: uuid.UUID,
        page: int,
        per_page: int,
    ) -> tuple[list[ChatMessage], int]:
        await self.get_session(user_id, session_id)

        offset = (page - 1) * per_page
        try:
            count_result = await self._db.execute(
                select(func.count(ChatMessage.id)).where(
                    ChatMessage.session_id == session_id
                )
            )
            total = count_result.scalar_one()

            msgs_result = await self._db.execute(
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at.asc())
                .offset(offset)
                .limit(per_page)
            )
            messages = list(msgs_result.scalars().all())
        except Exception:
            logger.exception("DB error listing messages for session %s", session_id)
            raise

        return messages, total
