from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_service_token
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TelegramAuthRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        svc = AuthService(db)
        _, access_token, refresh_token = await svc.register(req)
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error during registration")
        raise


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        svc = AuthService(db)
        _, access_token, refresh_token = await svc.login(req)
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error during login")
        raise




@router.post("/telegram", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def telegram_auth(
    req: TelegramAuthRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_service_token),
) -> TokenResponse:
    """Bot-only: issue JWT for a Telegram user_id. No password."""
    svc = AuthService(db)
    _, access_token, refresh_token = await svc.issue_telegram_token(
        req.telegram_user_id, req.display_name
    )
    await db.commit()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def refresh(
    req: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        svc = AuthService(db)
        access_token, new_refresh = await svc.refresh(req.refresh_token)
        return TokenResponse(access_token=access_token, refresh_token=new_refresh)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error during token refresh")
        raise


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    req: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        svc = AuthService(db)
        await svc.logout(req.refresh_token)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error during logout")
        raise


@router.get("/me", response_model=UserResponse)
async def me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)
