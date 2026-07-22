from __future__ import annotations

import logging
import uuid
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import ConflictError, NotFoundError
from app.models.character import Character
from app.schemas.character import CharacterCreate, CharacterUpdate

logger = logging.getLogger(__name__)


class CharacterService:
    MAX_PER_USER = 3
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

    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._faces_dir = Path(settings.DATA_DIR) / "faces"
        self._faces_dir.mkdir(parents=True, exist_ok=True)

    async def list_characters(self, user_id: uuid.UUID) -> list[Character]:
        try:
            result = await self._db.execute(
                select(Character)
                .where(Character.user_id == user_id, Character.is_active.is_(True))
                .order_by(Character.created_at)
            )
            return list(result.scalars().all())
        except Exception:
            logger.exception("DB error listing characters for user %s", user_id)
            raise

    async def get_character(
        self, user_id: uuid.UUID, character_id: uuid.UUID
    ) -> Character:
        try:
            result = await self._db.execute(
                select(Character).where(
                    Character.id == character_id,
                    Character.user_id == user_id,
                    Character.is_active.is_(True),
                )
            )
            character = result.scalar_one_or_none()
        except Exception:
            logger.exception("DB error fetching character %s", character_id)
            raise

        if character is None:
            raise NotFoundError(f"Character {character_id} not found")

        return character

    async def create_character(
        self,
        user_id: uuid.UUID,
        data: CharacterCreate,
        face_bytes: bytes | None,
    ) -> Character:
        try:
            count_result = await self._db.execute(
                select(func.count(Character.id)).where(
                    Character.user_id == user_id, Character.is_active.is_(True)
                )
            )
            count = count_result.scalar_one()
        except Exception:
            logger.exception("DB error counting characters for user %s", user_id)
            raise

        if count >= self.MAX_PER_USER:
            raise ConflictError(
                f"Maximum of {self.MAX_PER_USER} characters allowed per user"
            )

        character = Character(
            id=uuid.uuid4(),
            user_id=user_id,
            name=data.name,
            age=data.age,
            body_type=data.body_type,
            skin_tone=data.skin_tone,
            breast_size=data.breast_size,
            personality_type=data.personality_type,
        )

        if face_bytes is not None:
            face_path = self._save_face(character.id, face_bytes)
            character.face_image_path = str(face_path)

        self._db.add(character)
        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error inserting character")
            raise

        return character

    async def update_character(
        self,
        user_id: uuid.UUID,
        character_id: uuid.UUID,
        data: CharacterUpdate,
        face_bytes: bytes | None,
    ) -> Character:
        character = await self.get_character(user_id, character_id)

        if data.name is not None:
            character.name = data.name
        if data.age is not None:
            character.age = data.age
        if data.body_type is not None:
            character.body_type = data.body_type
        if data.skin_tone is not None:
            character.skin_tone = data.skin_tone
        if data.breast_size is not None:
            character.breast_size = data.breast_size
        if data.personality_type is not None:
            character.personality_type = data.personality_type

        if face_bytes is not None:
            if character.face_image_path:
                _try_delete_file(Path(character.face_image_path))
            face_path = self._save_face(character.id, face_bytes)
            character.face_image_path = str(face_path)

        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error updating character %s", character_id)
            raise

        return character

    async def delete_character(
        self, user_id: uuid.UUID, character_id: uuid.UUID
    ) -> None:
        character = await self.get_character(user_id, character_id)

        character.is_active = False

        if character.face_image_path:
            _try_delete_file(Path(character.face_image_path))
            character.face_image_path = None

        try:
            await self._db.flush()
        except Exception:
            logger.exception("DB error soft-deleting character %s", character_id)
            raise

    async def get_face_bytes(self, character: Character) -> bytes:
        if character.face_image_path is None:
            raise NotFoundError("Character has no face image")

        face_path = Path(character.face_image_path)
        if not face_path.exists():
            raise NotFoundError("Face image file not found on disk")

        try:
            return face_path.read_bytes()
        except OSError:
            logger.exception("Error reading face file %s", face_path)
            raise NotFoundError("Could not read face image")

    def _save_face(self, character_id: uuid.UUID, data: bytes) -> Path:
        path = self._faces_dir / f"{character_id}.jpg"
        try:
            path.write_bytes(data)
        except OSError:
            logger.exception("Error writing face file %s", path)
            raise
        return path


def _try_delete_file(path: Path) -> None:
    try:
        if path.exists():
            path.unlink()
    except OSError:
        logger.warning("Could not delete file %s", path)
