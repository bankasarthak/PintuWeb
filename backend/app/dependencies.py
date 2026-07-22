from __future__ import annotations

import logging
from collections.abc import Callable

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(token)
    user_id: str | None = payload.get("sub")
    token_type: str | None = payload.get("type")

    if user_id is None or token_type != "access":
        raise UnauthorizedError("Invalid token payload")

    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
    except Exception:
        logger.exception("DB error fetching user %s", user_id)
        raise UnauthorizedError()

    if user is None:
        raise UnauthorizedError("User not found")

    if not user.is_active:
        raise UnauthorizedError("User account is inactive")

    return user


get_current_active_user = Depends(get_current_user)


def require_credits(n: int) -> Callable:
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.credits < n:
            raise ForbiddenError(
                f"Insufficient credits. Required: {n}, available: {current_user.credits}"
            )
        return current_user

    return Depends(_check)
