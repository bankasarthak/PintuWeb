from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.telegram_auth import verify_telegram_login
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import RefreshToken, User
from app.schemas.auth import GoogleAuthRequest, LoginRequest, RegisterRequest, TelegramLoginRequest
from app.config import settings

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


    async def login_google(self, req: GoogleAuthRequest) -> tuple[User, str, str]:
        if not settings.GOOGLE_CLIENT_ID:
            raise UnauthorizedError("Google sign-in is not configured")

        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token as google_id_token
        except ImportError as exc:
            raise UnauthorizedError("Google sign-in is unavailable") from exc

        try:
            idinfo = google_id_token.verify_oauth2_token(
                req.id_token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except Exception:
            logger.exception("Google ID token verification failed")
            raise UnauthorizedError("Invalid Google sign-in token")

        if idinfo.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
            raise UnauthorizedError("Invalid Google sign-in token")

        email = idinfo.get("email")
        if not email or not idinfo.get("email_verified"):
            raise UnauthorizedError("Google account email is not verified")

        display_name = idinfo.get("name") or email.split("@")[0]

        try:
            result = await self._db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
        except Exception:
            logger.exception("DB error during Google login lookup")
            raise

        if user is None:
            user = User(
                id=uuid.uuid4(),
                email=email,
                auth_source="google",
                hashed_password=None,
                display_name=display_name[:60] if display_name else None,
                credits=10,
                plan_id="free",
                is_verified=True,
            )
            self._db.add(user)
            await self._db.flush()
        elif user.auth_source not in {"google", "website"}:
            raise ConflictError("This email is linked to a different sign-in method")

        if not user.is_active:
            raise UnauthorizedError("Account is inactive")

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))
        await self._store_refresh_token(user.id, refresh_token)
        return user, access_token, refresh_token

    async def login_telegram_widget(self, req: TelegramLoginRequest) -> tuple[User, str, str]:
        if not settings.TELEGRAM_BOT_TOKEN:
            raise UnauthorizedError("Telegram sign-in is not configured")

        payload = req.model_dump()
        if not verify_telegram_login(payload, settings.TELEGRAM_BOT_TOKEN):
            raise UnauthorizedError("Invalid Telegram sign-in")

        display_name = req.first_name or ""
        if req.last_name:
            display_name = f"{display_name} {req.last_name}".strip()
        if not display_name and req.username:
            display_name = req.username

        return await self.issue_telegram_token(req.id, display_name or str(req.id))


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
