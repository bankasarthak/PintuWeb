"""Razorpay payment link creation and webhook signature verification."""

from __future__ import annotations

import hashlib
import hmac
import logging
from base64 import b64encode

import aiohttp

from app.config import settings
from app.services.credit_packs import CREDIT_PACKS, PACK_BY_ID

logger = logging.getLogger(__name__)

# Backwards-compatible alias
RAZORPAY_PLANS = CREDIT_PACKS
PLAN_BY_ID = PACK_BY_ID


class RazorpayClient:
    BASE_URL = "https://api.razorpay.com/v1"

    def __init__(self) -> None:
        self._key_id = settings.RAZORPAY_KEY_ID
        self._key_secret = settings.RAZORPAY_KEY_SECRET
        self._webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

    @property
    def enabled(self) -> bool:
        return bool(self._key_id and self._key_secret)

    def _auth_header(self) -> str:
        credentials = f"{self._key_id}:{self._key_secret}"
        return "Basic " + b64encode(credentials.encode()).decode()

    async def create_payment_link(
        self,
        *,
        pintuweb_user_id: str,
        plan_id: str,
        credits: int,
        amount_paise: int,
        description: str,
        callback_url: str | None = None,
    ) -> dict:
        """Create a Razorpay Payment Link and return the API response dict."""
        notes = {
            "pintuweb_user_id": pintuweb_user_id,
            "plan_id": plan_id,
            "credits": str(credits),
        }

        payload: dict = {
            "amount": amount_paise,
            "currency": "INR",
            "accept_partial": False,
            "description": description,
            "notes": notes,
            "notify": {"sms": False, "email": False},
            "reminder_enable": False,
            "callback_method": "get",
        }
        if callback_url:
            payload["callback_url"] = callback_url

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.BASE_URL}/payment_links",
                json=payload,
                headers={
                    "Authorization": self._auth_header(),
                    "Content-Type": "application/json",
                },
            ) as resp:
                body = await resp.json(content_type=None)
                if resp.status not in (200, 201):
                    logger.error("Razorpay link creation failed: %s", body)
                    err = body.get("error", {}) if isinstance(body, dict) else {}
                    raise RuntimeError(
                        err.get("description", str(body))
                        if isinstance(err, dict)
                        else str(body)
                    )
                logger.info(
                    "Payment link created: user=%s plan=%s id=%s",
                    pintuweb_user_id,
                    plan_id,
                    body.get("id"),
                )
                return body

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        """Return True if the webhook signature is valid."""
        if not self._webhook_secret:
            return False
        expected = hmac.new(
            self._webhook_secret.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
