from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any


def verify_telegram_login(data: dict[str, Any], bot_token: str, *, max_age_secs: int = 86400) -> bool:
    """Validate Telegram Login Widget payload (https://core.telegram.org/widgets/login)."""
    payload = {k: v for k, v in data.items() if v is not None and k != "hash"}
    check_hash = data.get("hash")
    if not check_hash or not bot_token:
        return False

    auth_date = payload.get("auth_date")
    if auth_date is not None:
        try:
            if time.time() - int(auth_date) > max_age_secs:
                return False
        except (TypeError, ValueError):
            return False

    data_check_string = "\n".join(f"{k}={payload[k]}" for k in sorted(payload.keys()))
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(calculated_hash, str(check_hash))
