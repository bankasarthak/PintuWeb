from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.character import CharacterCreate, CharacterResponse, CharacterUpdate
from app.services.character_service import CharacterService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/characters", tags=["characters"])

_MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def _to_response(char: object) -> CharacterResponse:
    return CharacterResponse.from_orm(char)


@router.get("/", response_model=list[CharacterResponse])
async def list_characters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CharacterResponse]:
    try:
        svc = CharacterService(db)
        chars = await svc.list_characters(current_user.id)
        return [_to_response(c) for c in chars]
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error listing characters")
        raise


@router.post("/", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(
    name: str | None = Form(None),
    age: int = Form(...),
    body_type: str = Form(...),
    skin_tone: str = Form(...),
    breast_size: str = Form(...),
    personality_type: str = Form(default="sweet"),
    face_image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CharacterResponse:
    face_bytes: bytes | None = None
    if face_image is not None:
        face_bytes = await face_image.read(_MAX_BYTES + 1)
        if len(face_bytes) > _MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Face image exceeds {settings.MAX_FILE_SIZE_MB} MB limit",
            )

    data = CharacterCreate(
        name=name,
        age=age,
        body_type=body_type,
        skin_tone=skin_tone,
        breast_size=breast_size,
        personality_type=personality_type,
    )
    try:
        svc = CharacterService(db)
        char = await svc.create_character(current_user.id, data, face_bytes)
        return _to_response(char)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error creating character")
        raise


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    character_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CharacterResponse:
    try:
        svc = CharacterService(db)
        char = await svc.get_character(current_user.id, character_id)
        return _to_response(char)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching character %s", character_id)
        raise


@router.patch("/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: uuid.UUID,
    name: str | None = Form(None),
    age: int | None = Form(None),
    body_type: str | None = Form(None),
    skin_tone: str | None = Form(None),
    breast_size: str | None = Form(None),
    personality_type: str | None = Form(None),
    face_image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CharacterResponse:
    face_bytes: bytes | None = None
    if face_image is not None:
        face_bytes = await face_image.read(_MAX_BYTES + 1)
        if len(face_bytes) > _MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Face image exceeds {settings.MAX_FILE_SIZE_MB} MB limit",
            )

    data = CharacterUpdate(
        name=name,
        age=age,
        body_type=body_type,
        skin_tone=skin_tone,
        breast_size=breast_size,
        personality_type=personality_type,
    )
    try:
        svc = CharacterService(db)
        char = await svc.update_character(current_user.id, character_id, data, face_bytes)
        return _to_response(char)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error updating character %s", character_id)
        raise


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        svc = CharacterService(db)
        await svc.delete_character(current_user.id, character_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error deleting character %s", character_id)
        raise


@router.get("/{character_id}/face")
async def get_face_image(
    character_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    try:
        svc = CharacterService(db)
        char = await svc.get_character(current_user.id, character_id)
        face_bytes = await svc.get_face_bytes(char)
        return StreamingResponse(
            iter([face_bytes]),
            media_type="image/jpeg",
            headers={"Cache-Control": "private, max-age=3600"},
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching face for character %s", character_id)
        raise
