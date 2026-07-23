"""NOWPayments invoice creation and IPN signature verification."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

import aiohttp

from app.config import settings

logger = logging.getLogger(__name__)

SANDBOX_BASE = "https://api-sandbox.nowpayments.io/v1"
PRODUCTION_BASE = "https://api.nowpayments.io/v1"


def _sort_object(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _sort_object(obj[k]) for k in sorted(obj.keys())}
    if isinstance(obj, list):
        return [_sort_object(item) for item in obj]
    return obj


class NOWPaymentsClient:
    def __init__(self) -> None:
        self._api_key = settings.NOWPAYMENTS_API_KEY
        self._ipn_secret = settings.NOWPAYMENTS_IPN_SECRET
        self._base_url = SANDBOX_BASE if settings.NOWPAYMENTS_SANDBOX else PRODUCTION_BASE

    @property
    def enabled(self) -> bool:
        return bool(self._api_key)

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self._api_key,
            "Content-Type": "application/json",
        }

    async def create_invoice(
        self,
        *,
        price_amount: float,
        price_currency: str,
        order_id: str,
        order_description: str,
        ipn_callback_url: str,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        payload = {
            "price_amount": price_amount,
            "price_currency": price_currency.lower(),
            "order_id": order_id,
            "order_description": order_description,
            "ipn_callback_url": ipn_callback_url,
            "success_url": success_url,
            "cancel_url": cancel_url,
            "is_fixed_rate": True,
            "is_fee_paid_by_user": False,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._base_url}/invoice",
                json=payload,
                headers=self._headers(),
            ) as resp:
                body = await resp.json(content_type=None)
                if resp.status not in (200, 201):
                    logger.error("NOWPayments invoice creation failed: %s", body)
                    if isinstance(body, dict):
                        msg = body.get("message") or body.get("error") or str(body)
                    else:
                        msg = str(body)
                    raise RuntimeError(f"NOWPayments error: {msg}")
                logger.info(
                    "NOWPayments invoice created: order=%s invoice_id=%s",
                    order_id,
                    body.get("id"),
                )
                return body

    def verify_ipn_signature(self, payload: dict, signature: str) -> bool:
        if not self._ipn_secret or not signature:
            return False
        sorted_payload = _sort_object(payload)
        message = json.dumps(sorted_payload, separators=(",", ":"), ensure_ascii=False)
        expected = hmac.new(
            self._ipn_secret.encode(),
            message.encode(),
            hashlib.sha512,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
