from __future__ import annotations

from pathlib import Path
from typing import Optional

import requests
from PIL import Image, ImageDraw, ImageFont
from openai import OpenAI

from .config import Settings


def _get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    preferred = [
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for path in preferred:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def create_thumbnail_fallback(text: str, output_path: str) -> str:
    img = Image.new("RGB", (1280, 720), color=(18, 26, 51))
    draw = ImageDraw.Draw(img)

    for i in range(720):
        color = (18 + i // 16, 26 + i // 20, 51 + i // 14)
        draw.line((0, i, 1280, i), fill=color)

    font_big = _get_font(92)
    font_small = _get_font(44)

    title = text.strip().upper()[:42] or "NEW VIDEO"
    subtitle = "WATCH TILL THE END"

    draw.rectangle((70, 70, 1210, 640), outline=(250, 201, 64), width=6)
    draw.text((110, 220), title, font=font_big, fill=(255, 255, 255))
    draw.text((110, 500), subtitle, font=font_small, fill=(250, 201, 64))

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, quality=95)
    return output_path


def create_thumbnail_with_openai(topic: str, output_path: str, settings: Settings) -> Optional[str]:
    if not settings.openai_api_key:
        return None

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = (
        "Design a YouTube thumbnail image with strong contrast and clear focal subject. "
        f"Theme: {topic}. "
        "Style: bold, modern, high CTR, no unreadable tiny text."
    )

    result = client.images.generate(model="gpt-image-1", prompt=prompt, size="1536x1024")
    image_b64 = result.data[0].b64_json
    if not image_b64:
        return None

    import base64

    data = base64.b64decode(image_b64)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_path).write_bytes(data)

    with Image.open(output_path) as img:
        rgb = img.convert("RGB").resize((1280, 720))
        rgb.save(output_path, quality=95)

    return output_path


def create_thumbnail(topic: str, output_path: str, settings: Settings, use_ai: bool) -> str:
    if use_ai:
        ai_path = create_thumbnail_with_openai(topic=topic, output_path=output_path, settings=settings)
        if ai_path:
            return ai_path

    return create_thumbnail_fallback(text=topic, output_path=output_path)
