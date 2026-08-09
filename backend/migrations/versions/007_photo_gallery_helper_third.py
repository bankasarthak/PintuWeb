"""Add a 3rd helper slot to photo_gallery_entries.

Matches the "Create your own" custom-photo flow (bot/services/photo_gallery_service.py
build_custom_template) which supports up to SDXL_MAX_LORAS=3 helpers. Also applied
idempotently by PintuV3/migrations/014_photo_gallery_helper_third.sql against the
same shared Postgres DB.

Revision ID: 007
Revises: 006
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE photo_gallery_entries
            ADD COLUMN IF NOT EXISTS helper_third TEXT,
            ADD COLUMN IF NOT EXISTS helper_third_strength REAL NOT NULL DEFAULT 0.9
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE photo_gallery_entries DROP COLUMN IF EXISTS helper_third_strength")
    op.execute("ALTER TABLE photo_gallery_entries DROP COLUMN IF EXISTS helper_third")
