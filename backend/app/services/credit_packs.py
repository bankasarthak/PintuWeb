"""Shared credit pack definitions for UPI (INR) and crypto (USD)."""

from __future__ import annotations

CREDIT_PACKS: list[dict] = [
    {
        "id": "basic",
        "label": "Basic Plan",
        "credits": 25,
        "queue": "Basic Queue",
        "amount_inr": 75,
        "amount_paise": 7500,
        "amount_usd": 3.0,
    },
    {
        "id": "mid",
        "label": "Mid Plan",
        "credits": 125,
        "queue": "Mid Queue",
        "amount_inr": 300,
        "amount_paise": 30000,
        "amount_usd": 9.0,
    },
    {
        "id": "pro",
        "label": "Pro Plan",
        "credits": 400,
        "queue": "Top Queue",
        "amount_inr": 750,
        "amount_paise": 75000,
        "amount_usd": 19.0,
    },
]

PACK_BY_ID = {p["id"]: p for p in CREDIT_PACKS}
