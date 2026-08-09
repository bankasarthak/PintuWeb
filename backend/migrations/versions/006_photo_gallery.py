"""Public I2I "Photo" gallery — showcase entries with prompt + helpers.

Also created (idempotently) by PintuV3/migrations/013_photo_gallery_entries.sql,
which the bot applies automatically on every restart against the same shared
Postgres DB. This migration uses IF NOT EXISTS everywhere so it's a safe no-op
whichever one runs first.

Revision ID: 006
Revises: 005
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS photo_gallery_entries (
            id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
            label                   TEXT            NOT NULL,
            prompt                  TEXT            NOT NULL,
            negative_prompt         TEXT,
            helper_high             TEXT,
            helper_high_strength    REAL            NOT NULL DEFAULT 0.9,
            helper_low              TEXT,
            helper_low_strength     REAL            NOT NULL DEFAULT 0.9,
            tags                    JSONB           NOT NULL DEFAULT '[]'::jsonb,
            reference_face_r2_key   TEXT,
            showcase_r2_key         TEXT,
            status                  TEXT            NOT NULL DEFAULT 'draft',
            generation_job_id       UUID            REFERENCES jobs(id) ON DELETE SET NULL,
            is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
            sort_order              INTEGER         NOT NULL DEFAULT 0,
            created_by              BIGINT,
            created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
            updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_photo_gallery_entries_status_active "
        "ON photo_gallery_entries (status, is_active)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_photo_gallery_entries_tags "
        "ON photo_gallery_entries USING gin (tags)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_photo_gallery_entries_sort_order "
        "ON photo_gallery_entries (sort_order)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_photo_gallery_entries_sort_order")
    op.execute("DROP INDEX IF EXISTS idx_photo_gallery_entries_tags")
    op.execute("DROP INDEX IF EXISTS idx_photo_gallery_entries_status_active")
    op.execute("DROP TABLE IF EXISTS photo_gallery_entries")
