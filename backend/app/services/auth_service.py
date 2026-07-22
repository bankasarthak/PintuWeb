from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import RefreshToken, User
from app.schemas.auth import LoginRequest, RegisterRequest, TelegramAuthRequest

logger = logging.getLogger(__name__)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def register(
        self, req: RegisterRequest
    ) -> tuple[User, str, str]:
        try:
            result = await self._db.execute(
                select(User).where(User.email == req.email)
            )
            existing = result.scalar_one_or_none()
        except Exception:
            logger.exception("DB error checking email uniqueness")
            raise

        if existing is not None:
            raise ConflictError("Email is already registered")

        user = User(
            id=uuid.uuid4(),
            email=req.email,
            hashed_password=hash_password(req.password),
            display_name=req.display_name,
            credits=10,
        )
        self._db.add(user)
        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error creating user")
            raise

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))
        await self._store_refresh_token(user.id, refresh_token)

        return user, access_token, refresh_token

    async def login(self, req: LoginRequest) -> tuple[User, str, str]:
        try:
            result = await self._db.execute(
                select(User).where(User.email == req.email)
            )
            user = result.scalar_one_or_none()
        except Exception:
            logger.exception("DB error during login lookup")
            raise

        if (
            user is None
            or user.hashed_password is None
            or not verify_password(req.password, user.hashed_password)
        ):
            raise UnauthorizedError("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedError("Account is inactive")

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))
        await self._store_refresh_token(user.id, refresh_token)

        return user, access_token, refresh_token


    async def issue_telegram_token(
        self,
        telegram_user_id: int,
        display_name: str | None = None,
    ) -> tuple[User, str, str]:
        """Mint JWT for a Telegram user (bot service token only — no password)."""
        try:
            result = await self._db.execute(
                select(User).where(User.telegram_user_id == telegram_user_id)
            )
            user = result.scalar_one_or_none()
        except Exception:
            logger.exception("DB error looking up telegram user %s", telegram_user_id)
            raise

        if user is None:
            email = f"tg_{telegram_user_id}@pintuweb.internal"
            user = User(
                id=uuid.uuid4(),
                email=email,
                telegram_user_id=telegram_user_id,
                auth_source="telegram",
                hashed_password=None,
                display_name=display_name or str(telegram_user_id),
                credits=10,
                plan_id="free",
                is_verified=True,
            )
            self._db.add(user)
            await self._db.flush()

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))
        await self._store_refresh_token(user.id, refresh_token)
        return user, access_token, refresh_token

    async def refresh(self, refresh_token: str) -> tuple[str, str]:
        token_hash = _hash_token(refresh_token)
        try:
            result = await self._db.execute(
                select(RefreshToken).where(RefreshToken.token_hash == token_hash)
            )
            stored = result.scalar_one_or_none()
        except Exception:
            logger.exception("DB error fetching refresh token")
            raise

        if stored is None or stored.revoked:
            raise UnauthorizedError("Refresh token is invalid or revoked")

        if stored.expires_at < datetime.now(timezone.utc):
            raise UnauthorizedError("Refresh token has expired")

        stored.revoked = True
        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error revoking refresh token")
            raise

        payload = decode_token(refresh_token)
        user_id: str = payload["sub"]

        new_access = create_access_token(user_id)
        new_refresh = create_refresh_token(user_id)
        await self._store_refresh_token(uuid.UUID(user_id), new_refresh)

        return new_access, new_refresh

    async def logout(self, refresh_token: str) -> None:
        token_hash = _hash_token(refresh_token)
        try:
            result = await self._db.execute(
                select(RefreshToken).where(RefreshToken.token_hash == token_hash)
            )
            stored = result.scalar_one_or_none()
        except Exception:
            logger.exception("DB error fetching refresh token for logout")
            raise

        if stored is not None:
            stored.revoked = True
            try:
                await self._db.flush()
            except Exception:
                logger.exception("DB error revoking refresh token on logout")
                raise

    async def _store_refresh_token(
        self, user_id: uuid.UUID, token: str
    ) -> None:
        payload = decode_token(token)
        exp_ts: int = payload["exp"]
        expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)

        rt = RefreshToken(
            id=uuid.uuid4(),
            user_id=user_id,
            token_hash=_hash_token(token),
            expires_at=expires_at,
        )
        self._db.add(rt)
        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error storing refresh token")
            raise
