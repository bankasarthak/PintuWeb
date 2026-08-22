"""Admin dashboard analytics (shared DB)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.credit_packs import CREDIT_PACKS

WINDOW_HOURS = 24

TELEGRAM_STARS_BY_PLAN = {"basic": 100, "mid": 400, "pro": 1000}

# Beat id prefix → (story_id, title, emoji)
STORY_BY_BEAT_PREFIX: dict[str, tuple[str, str, str]] = {
    "cs": ("captured_slave", "Captured Slave", "⛓️"),
    "fw": ("forced_to_watch", "Forced to Watch", "👁"),
    "ls": ("alone_little_sister", "Alone Little Sister", "🏠"),
    "os": ("office_secretary", "Office Secretary", "💼"),
    "sm": ("corrupting_step_mom", "Corrupting Step Mom", "🔥"),
}


@lru_cache
def _story_catalog() -> dict[str, Any]:
    path = Path(__file__).resolve().parent.parent / "data" / "story_catalog.json"
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _since() -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=WINDOW_HOURS)


def _job_params(raw: Any) -> dict:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        return json.loads(raw) if raw else {}
    return dict(raw)


def job_source_label(entry_point: str, job_params: dict) -> str:
    if entry_point == "website":
        return "Website"
    if job_params.get("webapp_job"):
        return "Mini App"
    return "Telegram"


def _stars_for_description(description: str) -> int:
    if "Razorpay" in description:
        return 0
    for pack in CREDIT_PACKS:
        pid = pack["id"]
        if f"Purchase ({pid})" in description:
            return TELEGRAM_STARS_BY_PLAN.get(pid, 0)
    return 0


async def fetch_source_report(db: AsyncSession) -> tuple[list[dict[str, Any]], int]:
    since = _since()
    job_rows = (
        await db.execute(
            text(
                """
                SELECT j.id, j.user_id, j.status, j.credits_charged, j.entry_point,
                       j.job_params, j.created_at, u.created_at AS user_created_at
                FROM jobs j
                JOIN users u ON u.id = j.user_id
                WHERE j.created_at >= :since
                """
            ),
            {"since": since},
        )
    ).mappings().all()

    sources: dict[str, dict[str, Any]] = {}

    def bucket(src: str) -> dict[str, Any]:
        if src not in sources:
            sources[src] = {
                "new_users": set(),
                "existing_users": set(),
                "total_generations": 0,
                "free_generations": 0,
                "paid_generations": 0,
                "failed_generations": 0,
            }
        return sources[src]

    for row in job_rows:
        params = _job_params(row["job_params"])
        src = job_source_label(str(row["entry_point"]), params)
        b = bucket(src)
        b["total_generations"] += 1
        uid = row["user_id"]
        if row["user_created_at"] and row["user_created_at"] >= since:
            b["new_users"].add(uid)
        else:
            b["existing_users"].add(uid)
        free = (
            float(row["credits_charged"] or 0) <= 0
            or params.get("is_lucky_edit")
            or params.get("story_prepaid")
        )
        if free:
            b["free_generations"] += 1
        else:
            b["paid_generations"] += 1
        if str(row["status"]) in ("failed", "timed_out", "cancelled"):
            b["failed_generations"] += 1

    txn_rows = (
        await db.execute(
            text(
                """
                SELECT ct.description, ct.idempotency_key, u.auth_source
                FROM credit_transactions ct
                JOIN users u ON u.id = ct.user_id
                WHERE ct.txn_type = 'credit'
                  AND ct.created_at >= :since
                  AND ct.description LIKE 'Purchase%%'
                """
            ),
            {"since": since},
        )
    ).mappings().all()

    stars_by_source: dict[str, int] = {}
    razorpay_inr_by_source: dict[str, float] = {}

    for row in txn_rows:
        desc = str(row["description"] or "")
        stars = _stars_for_description(desc)
        src = "Website" if row["auth_source"] == "website" else "Telegram"
        if stars > 0:
            stars_by_source[src] = stars_by_source.get(src, 0) + stars

    payment_rows = (
        await db.execute(
            text(
                """
                SELECT po.price_amount, po.price_currency, u.auth_source
                FROM payment_orders po
                JOIN users u ON u.id = po.user_id
                WHERE po.fulfilled_at >= :since
                  AND po.status IN ('paid', 'finished', 'complete', 'confirmed')
                """
            ),
            {"since": since},
        )
    ).mappings().all()
    for row in payment_rows:
        src = "Website" if row["auth_source"] == "website" else "Telegram"
        if str(row["price_currency"]).upper() in ("INR", "IN"):
            razorpay_inr_by_source[src] = razorpay_inr_by_source.get(src, 0.0) + float(
                row["price_amount"] or 0
            )

    razorpay_events = int(
        (
            await db.execute(
                text(
                    """
                    SELECT COUNT(*) AS cnt FROM credit_transactions
                    WHERE created_at >= :since AND idempotency_key LIKE 'razorpay:%%'
                    """
                ),
                {"since": since},
            )
        ).scalar_one()
        or 0
    )

    order = ["Telegram", "Mini App", "Website"]
    out: list[dict[str, Any]] = []
    for src in order:
        b = sources.get(src, {})
        out.append(
            {
                "source": src,
                "new_users": len(b.get("new_users", set())),
                "existing_users": len(b.get("existing_users", set())),
                "total_generations": b.get("total_generations", 0),
                "free_generations": b.get("free_generations", 0),
                "paid_generations": b.get("paid_generations", 0),
                "failed_generations": b.get("failed_generations", 0),
                "total_stars": stars_by_source.get(src, 0),
                "razorpay_inr": round(razorpay_inr_by_source.get(src, 0.0), 2),
            }
        )
    return out, razorpay_events


async def fetch_overview_counts(db: AsyncSession) -> dict[str, int]:
    since = _since()
    row = (
        await db.execute(
            text(
                """
                SELECT
                  count(*) FILTER (WHERE job_type::text LIKE 'i2v%%') AS i2v,
                  count(*) FILTER (WHERE job_type::text LIKE 'i2i%%' OR job_type::text = 'random_ai') AS i2i,
                  count(*) FILTER (WHERE status = 'completed') AS completed
                FROM jobs WHERE created_at >= :since
                """
            ),
            {"since": since},
        )
    ).mappings().one()
    chat_n = (
        await db.execute(
            text("SELECT count(*) FROM chat_messages WHERE created_at >= :since"),
            {"since": since},
        )
    ).scalar_one()
    return {
        "i2v_jobs": int(row["i2v"] or 0),
        "i2i_jobs": int(row["i2i"] or 0),
        "completed_jobs": int(row["completed"] or 0),
        "chat_messages": int(chat_n or 0),
    }


async def fetch_i2v_template_groups(db: AsyncSession) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT scene_id, count(*) AS n
                FROM jobs
                WHERE job_type::text IN ('i2v', 'i2v_custom')
                  AND status = 'completed'
                  AND scene_id IS NOT NULL
                  AND scene_id NOT LIKE 'story_%%'
                  AND scene_id NOT IN ('i2v_custom', 'i2v_scene_builder')
                GROUP BY scene_id
                ORDER BY n DESC
                LIMIT 200
                """
            )
        )
    ).mappings().all()
    return [{"scene_id": r["scene_id"], "count": int(r["n"])} for r in rows]


def _beat_prefix(beat_id: str) -> str | None:
    if "_s" not in beat_id:
        return None
    return beat_id.split("_s", 1)[0]


async def fetch_story_groups(db: AsyncSession) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT scene_id, count(*) AS n
                FROM jobs
                WHERE status = 'completed' AND scene_id LIKE 'story_%%'
                GROUP BY scene_id
                """
            )
        )
    ).mappings().all()
    beat_counts = {str(r["scene_id"]): int(r["n"]) for r in rows}
    totals: dict[str, dict[str, Any]] = {}
    for sid, cnt in beat_counts.items():
        beat_id = sid.removeprefix("story_")
        prefix = _beat_prefix(beat_id)
        if not prefix or prefix not in STORY_BY_BEAT_PREFIX:
            continue
        story_id, title, emoji = STORY_BY_BEAT_PREFIX[prefix]
        if story_id not in totals:
            totals[story_id] = {
                "story_id": story_id,
                "title": title,
                "emoji": emoji,
                "count": 0,
            }
        totals[story_id]["count"] += cnt
    return sorted(totals.values(), key=lambda x: -x["count"])


async def fetch_story_scenes(db: AsyncSession, story_id: str) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT scene_id, count(*) AS n
                FROM jobs
                WHERE status = 'completed' AND scene_id LIKE 'story_%%'
                GROUP BY scene_id
                """
            )
        )
    ).mappings().all()
    beat_counts: dict[str, int] = {str(r["scene_id"]): int(r["n"]) for r in rows}

    catalog_entry = _story_catalog().get(story_id)
    if catalog_entry:
        out: list[dict[str, Any]] = []
        for sc in catalog_entry.get("scenes", []):
            scene_idx = int(sc["scene_index"])
            options: list[dict[str, Any]] = []
            scene_total = 0
            for beat in sc.get("beats", []):
                tid = beat["template_id"]
                cnt = beat_counts.get(tid, 0)
                scene_total += cnt
                options.append(
                    {
                        "beat_id": beat["beat_id"],
                        "template_id": tid,
                        "label": beat["label"],
                        "count": cnt,
                    }
                )
            options.sort(key=lambda x: (-x["count"], x["label"]))
            out.append(
                {
                    "scene_index": scene_idx,
                    "title": sc.get("title") or f"Scene {scene_idx}",
                    "count": scene_total,
                    "options": options,
                }
            )
        return out

    # Fallback: derive scenes from DB only (legacy)
    scenes: dict[int, dict[str, Any]] = {}
    import re

    for sid, cnt in beat_counts.items():
        beat_id = sid.removeprefix("story_")
        prefix = _beat_prefix(beat_id)
        if not prefix or prefix not in STORY_BY_BEAT_PREFIX:
            continue
        sid_story, _, _ = STORY_BY_BEAT_PREFIX[prefix]
        if sid_story != story_id:
            continue

        m = re.search(r"_s(\d+)_", beat_id)
        if not m:
            continue
        scene_idx = int(m.group(1))
        label = beat_id.split(f"_s{scene_idx}_", 1)[-1].replace("_", " ").title()
        if scene_idx not in scenes:
            scenes[scene_idx] = {
                "scene_index": scene_idx,
                "title": f"Scene {scene_idx}",
                "count": 0,
                "options": [],
            }
        scenes[scene_idx]["count"] += cnt
        scenes[scene_idx]["options"].append(
            {
                "beat_id": beat_id,
                "template_id": sid,
                "label": label,
                "count": cnt,
            }
        )
    out = []
    for idx in sorted(scenes.keys()):
        sc = scenes[idx]
        sc["options"] = sorted(sc["options"], key=lambda x: -x["count"])
        out.append(sc)
    return out


async def fetch_i2i_groups(db: AsyncSession) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT scene_id, job_type::text AS job_type, count(*) AS n
                FROM jobs
                WHERE status = 'completed'
                  AND (job_type::text LIKE 'i2i%%' OR job_type::text = 'random_ai')
                GROUP BY scene_id, job_type
                ORDER BY n DESC
                """
            )
        )
    ).mappings().all()
    return [
        {
            "scene_id": r["scene_id"] or r["job_type"],
            "job_type": r["job_type"],
            "count": int(r["n"]),
        }
        for r in rows
    ]


async def fetch_jobs_page(
    db: AsyncSession,
    *,
    scene_id: str | None = None,
    i2v_bucket: str | None = None,
    page: int = 1,
    per_page: int = 10,
) -> tuple[list[dict[str, Any]], int]:
    page = max(1, page)
    offset = (page - 1) * per_page
    conditions = ["j.status = 'completed'", "j.output_r2_key IS NOT NULL"]
    params: dict[str, Any] = {"limit": per_page, "offset": offset}

    if scene_id:
        conditions.append("j.scene_id = :scene_id")
        params["scene_id"] = scene_id
    elif i2v_bucket:
        b = i2v_bucket
        if b == "custom":
            conditions.append("(j.scene_id = 'i2v_custom' OR j.job_type::text = 'i2v_custom')")
        elif b == "create_scene":
            conditions.append("j.scene_id = 'i2v_scene_builder'")
        elif b == "story":
            conditions.append("j.scene_id LIKE 'story_%'")
        elif b == "templates":
            conditions.append(
                "j.job_type::text IN ('i2v', 'i2v_custom') "
                "AND j.scene_id IS NOT NULL "
                "AND j.scene_id NOT LIKE 'story_%' "
                "AND j.scene_id NOT IN ('i2v_custom', 'i2v_scene_builder')"
            )

    where = " AND ".join(conditions)
    total = int(
        (await db.execute(text(f"SELECT count(*) FROM jobs j WHERE {where}"), params)).scalar_one()
        or 0
    )
    rows = (
        await db.execute(
            text(
                f"""
                SELECT j.id, j.scene_id, j.job_type::text AS job_type, j.created_at, j.completed_at,
                       j.output_r2_key, j.input_r2_key, j.final_prompt, j.entry_point, j.job_params,
                       u.telegram_user_id, u.email
                FROM jobs j
                JOIN users u ON u.id = j.user_id
                WHERE {where}
                ORDER BY j.completed_at DESC NULLS LAST, j.created_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        )
    ).mappings().all()

    jobs = []
    for r in rows:
        jp = _job_params(r["job_params"])
        jobs.append(
            {
                "id": str(r["id"]),
                "scene_id": r["scene_id"],
                "job_type": r["job_type"],
                "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
                "output_r2_key": r["output_r2_key"],
                "input_r2_key": r["input_r2_key"],
                "has_output": bool(r["output_r2_key"]),
                "has_source": bool(r["input_r2_key"]),
                "prompt_snip": (r["final_prompt"] or "")[:160],
                "source": job_source_label(str(r["entry_point"]), jp),
                "tg_user_id": r["telegram_user_id"],
                "email": r["email"],
            }
        )
    return jobs, total


async def fetch_chat_users(
    db: AsyncSession, page: int = 1, per_page: int = 30
) -> tuple[list[dict[str, Any]], int]:
    page = max(1, page)
    offset = (page - 1) * per_page
    total = int(
        (
            await db.execute(
                text(
                    """
                    SELECT count(DISTINCT s.user_id)
                    FROM chat_sessions s
                    JOIN chat_messages m ON m.session_id = s.id
                    """
                )
            )
        ).scalar_one()
        or 0
    )
    rows = (
        await db.execute(
            text(
                """
                SELECT u.id AS user_id, u.telegram_user_id, u.email,
                       count(DISTINCT s.id) AS session_count,
                       count(m.id) AS message_count,
                       max(m.created_at) AS last_message_at
                FROM chat_sessions s
                JOIN users u ON u.id = s.user_id
                JOIN chat_messages m ON m.session_id = s.id
                GROUP BY u.id, u.telegram_user_id, u.email
                ORDER BY max(m.created_at) DESC NULLS LAST
                LIMIT :limit OFFSET :offset
                """
            ),
            {"limit": per_page, "offset": offset},
        )
    ).mappings().all()
    items = [
        {
            "user_id": str(r["user_id"]),
            "tg_user_id": r["telegram_user_id"],
            "email": r["email"],
            "session_count": int(r["session_count"] or 0),
            "message_count": int(r["message_count"] or 0),
            "last_message_at": r["last_message_at"].isoformat()
            if r["last_message_at"]
            else None,
        }
        for r in rows
    ]
    return items, total


async def fetch_chat_characters_for_user(
    db: AsyncSession, user_id: str
) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT s.id AS session_id, s.title, s.last_active,
                       c.id AS character_id, c.name AS character_name,
                       count(m.id) AS message_count,
                       min(m.created_at) AS first_message_at,
                       max(m.created_at) AS last_message_at
                FROM chat_sessions s
                JOIN characters c ON c.id = s.character_id
                JOIN chat_messages m ON m.session_id = s.id
                WHERE s.user_id = :user_id
                GROUP BY s.id, s.title, s.last_active, c.id, c.name
                ORDER BY max(m.created_at) DESC NULLS LAST
                """
            ),
            {"user_id": user_id},
        )
    ).mappings().all()
    return [
        {
            "session_id": str(r["session_id"]),
            "session_title": r["title"],
            "character_id": str(r["character_id"]),
            "character_name": r["character_name"] or "Character",
            "message_count": int(r["message_count"] or 0),
            "first_message_at": r["first_message_at"].isoformat()
            if r["first_message_at"]
            else None,
            "last_message_at": r["last_message_at"].isoformat()
            if r["last_message_at"]
            else None,
            "last_active": r["last_active"].isoformat() if r["last_active"] else None,
        }
        for r in rows
    ]


async def fetch_chat_session_messages(
    db: AsyncSession, session_id: str
) -> dict[str, Any] | None:
    header = (
        await db.execute(
            text(
                """
                SELECT s.id, s.title, s.user_id, u.telegram_user_id, u.email,
                       c.name AS character_name
                FROM chat_sessions s
                JOIN users u ON u.id = s.user_id
                JOIN characters c ON c.id = s.character_id
                WHERE s.id = :session_id
                """
            ),
            {"session_id": session_id},
        )
    ).mappings().first()
    if not header:
        return None
    rows = (
        await db.execute(
            text(
                """
                SELECT id, role, content, created_at
                FROM chat_messages
                WHERE session_id = :session_id
                ORDER BY created_at ASC
                """
            ),
            {"session_id": session_id},
        )
    ).mappings().all()
    return {
        "session_id": str(header["id"]),
        "user_id": str(header["user_id"]),
        "session_title": header["title"],
        "character_name": header["character_name"] or "Character",
        "tg_user_id": header["telegram_user_id"],
        "email": header["email"],
        "messages": [
            {
                "id": str(r["id"]),
                "role": r["role"],
                "content": r["content"] or "",
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ],
    }


async def fetch_chat_page(
    db: AsyncSession, page: int = 1, per_page: int = 10
) -> tuple[list[dict[str, Any]], int]:
    page = max(1, page)
    offset = (page - 1) * per_page
    total = int((await db.execute(text("SELECT count(*) FROM chat_messages"))).scalar_one() or 0)
    rows = (
        await db.execute(
            text(
                """
                SELECT m.id, m.role, m.content, m.created_at, s.id AS session_id,
                       u.telegram_user_id, u.email
                FROM chat_messages m
                JOIN chat_sessions s ON s.id = m.session_id
                JOIN users u ON u.id = s.user_id
                ORDER BY m.created_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            {"limit": per_page, "offset": offset},
        )
    ).mappings().all()
    items = [
        {
            "id": str(r["id"]),
            "role": r["role"],
            "content": (r["content"] or "")[:500],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "tg_user_id": r["telegram_user_id"],
            "email": r["email"],
        }
        for r in rows
    ]
    return items, total
