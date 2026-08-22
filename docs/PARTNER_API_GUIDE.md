# Partner Video Generation API — Guide for external SFW services

This describes a PintuWeb backend feature: a way for **external, non-PintuWeb
services** (e.g. a digital wedding-invitation-video creator) to submit a photo
+ a **literal, unmodified prompt** and get back an animated video, using the
same GPU / job queue as the main Pintu bot and PintuWeb site — with **top
(admin) priority**, so it jumps ahead of all normal user traffic.

There is no prompt enhancement, no LoRA auto-attachment, no negative-prompt
injection, no credit debit, and no per-caller rate limit on this path. The
prompt you send is the prompt that gets rendered — nothing added, nothing
removed. Only use this for SFW (safe-for-work) use cases — this endpoint
skips every one of PintuWeb's internal safety/moderation layers, so it's
handed out on trust, not enforcement.

## 1. Where this lives

Implemented in the **PintuWeb backend** (FastAPI service):

- `backend/app/routers/partner.py` — the two HTTP endpoints (`/partner/generate`)
- `backend/app/services/raw_generate_service.py` — shared job-creation logic
  (also used by the separate, invite-maker-only `/internal/raw-generate`)
- `backend/app/services/i2v_job_builder.py` — `build_raw_i2v_job_params()`
  (builds the ComfyUI workflow with zero LoRAs, your prompt/negative verbatim)

## 2. Base URL & authentication

All calls go to the PintuWeb backend's public API host, e.g.
`https://api.<something>.krewbay.in` in production. Get the exact value from
whoever runs the PintuWeb EC2 instance.

Auth is a single shared API key, sent as a header:

```
X-API-Key: <the PARTNER_API_KEY value from PintuWeb backend's .env>
```

This is **not** the same secret as `SERVICE_API_TOKEN` (used internally by
the Telegram bot and invite-maker) — it's a separate key on purpose, so a
leaked partner key can never reach bot↔backend internal routes.

Requests without a valid key get `401 Invalid API key`. There's no per-user
auth — this is a server-to-server trust relationship, so **only call this
from your backend, never from browser JS** (the key would be exposed).

## 3. Submit a job

```
POST /partner/generate
Content-Type: multipart/form-data
X-API-Key: <key>
```

Form fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_image` | file | yes | JPEG/PNG/WEBP etc. Max size = PintuWeb's `MAX_FILE_SIZE_MB` (10MB by default). |
| `prompt` | string | yes | Sent to the model **exactly as-is**. No enhancement, no rewriting. |
| `negative_prompt` | string | no | Defaults to `""`. Include your own quality/anatomy guardrails if you want them — none are added automatically. |
| `num_frames` | int | no | Default `85` (~6s @ 14fps). |
| `fps` | int | no | Default `14`. |
| `guidance_scale` | float | no | Default `1.0` (WAN 2.2 distilled model — don't raise much above 1–2). |
| `num_inference_steps` | int | no | Default `6`. |
| `idempotency_key` | string | no | Optional dedupe key if you want to safely retry a submit. |

The server auto-crops/resizes your image server-side to one of three fixed
video aspect ratios based on the input's aspect ratio — no pre-resize needed:

- wide input → `832×480`
- tall input → `480×832`
- ~square input → `624×624`

**Response — `202 Accepted`:**

```json
{
  "job_id": "5f0b6e2e-9e2a-4c9b-9d1e-8b7a2b6b1a11",
  "status": "queued",
  "queue_position_hint": "admin-priority"
}
```

Save `job_id` — you'll poll with it.

**Error responses:**

| Status | Meaning |
|---|---|
| `401` | Missing/invalid `X-API-Key` |
| `413` | Image exceeds max upload size |
| `422` | Missing/empty `prompt`, or bad form data |
| `503` | `PARTNER_API_KEY` not configured server-side (ops issue, not yours) |

## 4. Poll for the result

```
GET /partner/generate/{job_id}
X-API-Key: <key>
```

**Response — `200 OK`:**

```json
{
  "id": "5f0b6e2e-9e2a-4c9b-9d1e-8b7a2b6b1a11",
  "status": "processing",
  "output_url": null,
  "output_r2_key": null,
  "error_message": null,
  "progress": null
}
```

`status` moves through this state machine:

```
queued → claimed → processing → completed
                               ↘ failed
                               ↘ timed_out
```

When `status == "completed"`, `output_url` is a **presigned Cloudflare R2
URL** (valid 1 hour — call GET again to mint a fresh one if it expires)
pointing at an MP4 (H.264) video.

When `status == "failed"` or `"timed_out"`, check `error_message`.

**Polling recommendation:** every 3–5 seconds. Typical end-to-end time on the
shared GPU is ~2–4 minutes depending on queue depth, though your jobs jump to
the front (admin priority). Set a client-side timeout of ~10 minutes; the
worker marks a job `timed_out` after `JOB_MAX_DURATION_SECS` (10 minutes).

**404** means the job either doesn't exist or wasn't created via this
endpoint (lookups are scoped to `entry_point="partner"` jobs only).

## 5. Sample code (Python + httpx)

```python
"""Thin async client for PintuWeb's partner video-generation API."""

import asyncio
import os

import httpx

PINTUWEB_API_BASE_URL = os.getenv("PINTUWEB_API_BASE_URL", "http://localhost:8000")
PINTUWEB_PARTNER_API_KEY = os.getenv("PINTUWEB_PARTNER_API_KEY", "")
REQUEST_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


class PartnerApiError(RuntimeError):
    """Raised when PintuWeb's partner API returns an error or times out."""


def _headers() -> dict:
    if not PINTUWEB_PARTNER_API_KEY:
        raise PartnerApiError("PINTUWEB_PARTNER_API_KEY is not set")
    return {"X-API-Key": PINTUWEB_PARTNER_API_KEY}


async def submit_job(
    *,
    image_bytes: bytes,
    filename: str,
    content_type: str,
    prompt: str,
    negative_prompt: str = "",
    num_frames: int | None = None,
    fps: int | None = None,
) -> str:
    """Submit a job; returns the job_id."""
    data = {"prompt": prompt, "negative_prompt": negative_prompt}
    if num_frames is not None:
        data["num_frames"] = str(num_frames)
    if fps is not None:
        data["fps"] = str(fps)

    files = {"source_image": (filename, image_bytes, content_type)}

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        resp = await client.post(
            f"{PINTUWEB_API_BASE_URL}/partner/generate",
            headers=_headers(),
            data=data,
            files=files,
        )
    if resp.status_code >= 400:
        raise PartnerApiError(f"submit failed ({resp.status_code}): {resp.text}")
    return resp.json()["job_id"]


async def wait_for_job(job_id: str, *, poll_secs: float = 4.0, timeout_secs: float = 600.0) -> str:
    """Poll until the job completes; returns the presigned output video URL."""
    elapsed = 0.0
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        while elapsed < timeout_secs:
            resp = await client.get(
                f"{PINTUWEB_API_BASE_URL}/partner/generate/{job_id}",
                headers=_headers(),
            )
            if resp.status_code >= 400:
                raise PartnerApiError(f"poll failed ({resp.status_code}): {resp.text}")

            body = resp.json()
            status = body["status"]
            if status == "completed":
                return body["output_url"]
            if status in ("failed", "timed_out", "cancelled"):
                raise PartnerApiError(f"Job {job_id} ended with status={status}: {body.get('error_message')}")

            await asyncio.sleep(poll_secs)
            elapsed += poll_secs

    raise PartnerApiError(f"Job {job_id} did not complete within {timeout_secs}s")


async def generate_video(
    *, image_bytes: bytes, filename: str, content_type: str, prompt: str, negative_prompt: str = ""
) -> str:
    """Convenience wrapper: submit + poll. Returns the final video URL."""
    job_id = await submit_job(
        image_bytes=image_bytes,
        filename=filename,
        content_type=content_type,
        prompt=prompt,
        negative_prompt=negative_prompt,
    )
    return await wait_for_job(job_id)
```

## 6. Things to keep in mind

- **SFW only.** This path bypasses every content-moderation/enhancement layer
  PintuWeb normally applies — it exists for trusted, safe-for-work use cases
  (e.g. wedding invitations). Don't point NSFW traffic at it.
- **This is a shared, single GPU.** Admin priority means your jobs jump the
  queue, but they still process one at a time. Don't build a UI that assumes
  instant/parallel results.
- **No credits, no accounting, no rate limit** on this path by design — treat
  it like a scarce shared resource, not something to hammer in a tight loop.
- **Nothing is added to your prompt.** Include your own quality/negative
  guardrails in `negative_prompt` if you need them.
- Every job is billed internally to a single shared placeholder account
  (`partner-api@pintuweb.internal`) that PintuWeb auto-creates on first call.
- **One shared key for all partners today.** If a second external partner
  needs isolated revocation/attribution later, this should be upgraded to a
  per-partner keys table (`entry_point` is already parameterized in
  `RawGenerateService` for exactly this).
