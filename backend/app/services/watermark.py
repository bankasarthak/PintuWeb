"""Burn a static 'PintuUndressBot' watermark into generated images/videos.

Applied as a post-process step in worker.py, right before upload to R2 — this
keeps watermarking centralized in one place regardless of which pod, checkpoint,
or workflow template produced the output.

Watermarking failures never fail the job: on any error we log and return the
original bytes unmodified, so a rendering bug here can't turn into a refund.
"""

from __future__ import annotations

import asyncio
import logging
import os
import tempfile
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

WATERMARK_TEXT = "PintuUndressBot"

_FONT_PATH = Path(__file__).resolve().parent.parent / "assets" / "fonts" / "DejaVuSans-Bold.ttf"

# Fraction of the shorter media dimension used for font size / padding, so the
# watermark scales sensibly across different output resolutions.
_FONT_SIZE_RATIO = 0.045
_PADDING_RATIO = 0.03


def _font_size_for(width: int, height: int) -> int:
    return max(14, int(min(width, height) * _FONT_SIZE_RATIO))


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(str(_FONT_PATH), size)
    except Exception:
        logger.warning("Watermark font not found at %s, falling back to default", _FONT_PATH)
        return ImageFont.load_default()


def _draw_watermark(draw: ImageDraw.ImageDraw, width: int, height: int) -> None:
    """Draw WATERMARK_TEXT bottom-right, white fill + black stroke for visibility
    on any background, no matter how light or dark."""
    font_size = _font_size_for(width, height)
    font = _load_font(font_size)
    padding = max(8, int(min(width, height) * _PADDING_RATIO))

    bbox = draw.textbbox((0, 0), WATERMARK_TEXT, font=font, stroke_width=max(1, font_size // 12))
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    x = width - text_w - padding - bbox[0]
    y = height - text_h - padding - bbox[1]

    draw.text(
        (x, y),
        WATERMARK_TEXT,
        font=font,
        fill=(255, 255, 255, 255),
        stroke_width=max(1, font_size // 12),
        stroke_fill=(0, 0, 0, 255),
    )


def _watermark_image_sync(image_bytes: bytes) -> bytes:
    with Image.open(BytesIO(image_bytes)) as im:
        im = im.convert("RGB")
        overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        _draw_watermark(draw, im.width, im.height)
        im = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")

        out = BytesIO()
        im.save(out, format="JPEG", quality=92)
        return out.getvalue()


def _probe_video_size(path: str) -> tuple[int, int]:
    import subprocess

    proc = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=p=0", path,
        ],
        capture_output=True, text=True, timeout=15,
    )
    w_str, h_str = proc.stdout.strip().split(",")
    return int(w_str), int(h_str)


def _watermark_video_sync(video_bytes: bytes) -> bytes:
    import subprocess

    with tempfile.TemporaryDirectory() as tmp:
        in_path = os.path.join(tmp, "in.mp4")
        out_path = os.path.join(tmp, "out.mp4")
        with open(in_path, "wb") as f:
            f.write(video_bytes)

        width, height = _probe_video_size(in_path)
        font_size = _font_size_for(width, height)
        padding = max(8, int(min(width, height) * _PADDING_RATIO))
        border = max(1, font_size // 12)

        drawtext = (
            f"drawtext=fontfile='{_FONT_PATH}':text='{WATERMARK_TEXT}':"
            f"fontsize={font_size}:fontcolor=white:"
            f"borderw={border}:bordercolor=black:"
            f"x=w-tw-{padding}:y=h-th-{padding}"
        )

        proc = subprocess.run(
            [
                "ffmpeg", "-y", "-i", in_path,
                "-vf", drawtext,
                "-c:v", "libx264", "-preset", "fast", "-crf", "20",
                "-c:a", "copy",
                out_path,
            ],
            capture_output=True, text=True, timeout=120,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg watermark failed: {proc.stderr[-2000:]}")

        with open(out_path, "rb") as f:
            return f.read()


async def apply_image_watermark(image_bytes: bytes) -> bytes:
    try:
        return await asyncio.to_thread(_watermark_image_sync, image_bytes)
    except Exception:
        logger.exception("Image watermark failed, uploading original output")
        return image_bytes


async def apply_video_watermark(video_bytes: bytes) -> bytes:
    try:
        return await asyncio.to_thread(_watermark_video_sync, video_bytes)
    except Exception:
        logger.exception("Video watermark failed, uploading original output")
        return video_bytes
