from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from .config import Settings
from .models import MetadataSuggestion
from .prompts import SYSTEM_PROMPT, build_user_prompt


class LLMClient:
    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required.")
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def generate_metadata(
        self,
        video_title: str,
        video_description: str,
        existing_tags: list[str],
        notes: str,
        competitor_lines: list[str],
        max_tags: int,
    ) -> MetadataSuggestion:
        prompt = build_user_prompt(
            video_title=video_title,
            video_description=video_description,
            existing_tags=existing_tags,
            notes=notes,
            competitor_lines=competitor_lines,
        )

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0.6,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"
        payload: dict[str, Any] = json.loads(content)

        tags = [t.strip() for t in payload.get("tags", []) if t and t.strip()]
        return MetadataSuggestion(
            title=str(payload.get("title", video_title)).strip(),
            description=str(payload.get("description", video_description)).strip(),
            tags=tags[:max_tags],
            topic_summary=str(payload.get("topic_summary", "")).strip(),
        )
