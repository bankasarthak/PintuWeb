from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.database import init_db
from app.routers import (
    auth_router,
    characters_router,
    chat_router,
    gallery_router,
    generate_router,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

_watchdog_task: asyncio.Task | None = None


def _sanitize_dsn(dsn: str) -> str:
    """Redact password from a Postgres DSN for logging."""
    try:
        from urllib.parse import urlparse

        parsed = urlparse(dsn)
        if parsed.password:
            return dsn.replace(f":{parsed.password}@", ":***@")
    except Exception:
        pass
    return dsn


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global _watchdog_task
    logger.info("=" * 60)
    logger.info("PintuWeb API starting")
    logger.info("Database URL: %s", _sanitize_dsn(settings.DATABASE_URL))
    logger.info("Ollama URL: %s", settings.OLLAMA_URL)
    logger.info("Ollama model: %s", settings.OLLAMA_MODEL)
    logger.info("R2 enabled: %s (bucket=%s)", settings.r2_enabled, settings.R2_BUCKET)
    logger.info("Service API token configured: %s", bool(settings.SERVICE_API_TOKEN))
    logger.info("CORS origins: %s", settings.CORS_ORIGINS)
    logger.info("=" * 60)

    await init_db()
    logger.info("Database ready")

    # Start watchdog as a background task inside the API process.
    # On a separate pod, run `python watchdog.py` instead.
    from watchdog import run_watchdog  # noqa: PLC0415
    _watchdog_task = asyncio.create_task(run_watchdog(), name="watchdog")
    logger.info("Watchdog started")

    yield

    logger.info("Shutting down PintuWeb API")
    if _watchdog_task and not _watchdog_task.done():
        _watchdog_task.cancel()
        try:
            await _watchdog_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="PintuWeb API",
    version="1.0.0",
    description="AI companion platform backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(characters_router)
app.include_router(generate_router)
app.include_router(chat_router)
app.include_router(gallery_router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    from app.services.llm_client import LLMClient
    llm = LLMClient(base_url=settings.OLLAMA_URL, model=settings.OLLAMA_MODEL)
    llm_ok = await llm.health_check()
    result = {
        "status": "ok",
        "ollama_url": settings.OLLAMA_URL,
        "ollama_model": settings.OLLAMA_MODEL,
        "llm_reachable": llm_ok,
    }
    logger.info("Health check: %s", result)
    return result
