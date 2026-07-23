"""Prepare user source images for WAN I2V (fixed output resolution, face-safe crop)."""

from __future__ import annotations

import io
import logging

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)


def target_video_size(width: int, height: int) -> tuple[int, int]:
    aspect = width / height
    if aspect >= 1.3:
        return 832, 480
    if aspect <= 0.77:
        return 480, 832
    return 624, 624


def _cover_crop_top(
    img: Image.Image, target_w: int, target_h: int, *, portrait_face_boost: bool = False
) -> Image.Image:
    w, h = img.size
    scale = max(target_w / w, target_h / h)
    if portrait_face_boost and h / w > 1.15:
        scale *= 1.12
    new_w = max(target_w, int(round(w * scale)))
    new_h = max(target_h, int(round(h * scale)))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    left = max(0, (new_w - target_w) // 2)
    top = 0 if new_h > target_h else max(0, (new_h - target_h) // 2)
    top = min(top, max(0, new_h - target_h))
    return resized.crop((left, top, left + target_w, top + target_h))


def prepare_i2v_image(image_bytes: bytes) -> tuple[bytes, int, int]:
    """Resize/crop source image to the exact I2V frame size before ComfyUI upload."""
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
    src_w, src_h = img.size
    target_w, target_h = target_video_size(src_w, src_h)
    portrait = src_h / src_w > 1.15
    prepared = _cover_crop_top(img, target_w, target_h, portrait_face_boost=portrait)

    buf = io.BytesIO()
    prepared.save(buf, format="JPEG", quality=95)
    out = buf.getvalue()
    logger.info(
        "Prepared I2V image: %dx%d -> %dx%d (%d bytes%s)",
        src_w,
        src_h,
        target_w,
        target_h,
        len(out),
        ", portrait face boost" if portrait else "",
    )
    return out, target_w, target_h
