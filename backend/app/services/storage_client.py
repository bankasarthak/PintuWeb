"""
Cloudflare R2 storage client (S3-compatible).

Falls back to local disk when R2 is not configured (dev mode).
Never stores files permanently on the pod — inputs are deleted after download,
outputs are uploaded then deleted from local disk.
"""
from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

import aioboto3
from botocore.config import Config

from app.config import Settings

logger = logging.getLogger(__name__)

_PRESIGN_TTL = 3600  # 1 hour


class StorageClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._local_dir = Path(settings.DATA_DIR) / "storage"
        self._local_dir.mkdir(parents=True, exist_ok=True)

    # ── Public API ────────────────────────────────────────────────────────────

    async def upload(self, data: bytes, prefix: str, suffix: str = ".jpg") -> str:
        """Upload bytes; return the R2 object key (or local path in dev)."""
        key = f"{prefix}/{uuid.uuid4()}{suffix}"
        if self._settings.r2_enabled:
            await self._r2_put(key, data)
        else:
            (self._local_dir / key.replace("/", "_")).write_bytes(data)
        return key

    async def download(self, key: str) -> bytes:
        """Download bytes by key."""
        if self._settings.r2_enabled:
            return await self._r2_get(key)
        local_path = self._local_dir / key.replace("/", "_")
        if not local_path.exists():
            raise FileNotFoundError(f"Key not found locally: {key}")
        return local_path.read_bytes()

    async def delete(self, key: str) -> None:
        """Delete an object. Swallows not-found errors."""
        if self._settings.r2_enabled:
            await self._r2_delete(key)
        else:
            local_path = self._local_dir / key.replace("/", "_")
            local_path.unlink(missing_ok=True)

    async def presigned_url(self, key: str, ttl: int = _PRESIGN_TTL) -> str:
        """Return a presigned GET URL valid for `ttl` seconds."""
        if not self._settings.r2_enabled:
            # In dev, return a local file:// URL (frontend must be same machine)
            return f"file://{self._local_dir / key.replace('/', '_')}"
        if self._settings.R2_PUBLIC_URL:
            return f"{self._settings.R2_PUBLIC_URL.rstrip('/')}/{key}"
        session = aioboto3.Session(
            aws_access_key_id=self._settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=self._settings.R2_SECRET_ACCESS_KEY,
        )
        async with session.client(
            "s3",
            endpoint_url=self._settings.r2_endpoint_url,
            config=Config(signature_version="s3v4"),
        ) as s3:
            return await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._settings.R2_BUCKET, "Key": key},
                ExpiresIn=ttl,
            )

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _session(self) -> aioboto3.Session:
        return aioboto3.Session(
            aws_access_key_id=self._settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=self._settings.R2_SECRET_ACCESS_KEY,
        )

    async def _r2_put(self, key: str, data: bytes) -> None:
        async with self._session().client(
            "s3",
            endpoint_url=self._settings.r2_endpoint_url,
            config=Config(signature_version="s3v4"),
        ) as s3:
            await s3.put_object(
                Bucket=self._settings.R2_BUCKET,
                Key=key,
                Body=data,
            )

    async def _r2_get(self, key: str) -> bytes:
        async with self._session().client(
            "s3",
            endpoint_url=self._settings.r2_endpoint_url,
            config=Config(signature_version="s3v4"),
        ) as s3:
            resp = await s3.get_object(Bucket=self._settings.R2_BUCKET, Key=key)
            return await resp["Body"].read()

    async def _r2_delete(self, key: str) -> None:
        async with self._session().client(
            "s3",
            endpoint_url=self._settings.r2_endpoint_url,
            config=Config(signature_version="s3v4"),
        ) as s3:
            try:
                await s3.delete_object(Bucket=self._settings.R2_BUCKET, Key=key)
            except Exception:
                logger.warning("R2 delete failed for key %s", key, exc_info=True)
