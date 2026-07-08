from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

from .competitor_research import build_search_query, fetch_competitor_videos, to_prompt_lines
from .config import Settings
from .llm import LLMClient
from .thumbnail_generator import create_thumbnail
from .youtube_client import YouTubeClient


class YouTubeOptimizationPipeline:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.youtube = YouTubeClient()
        self.llm = LLMClient(settings=settings)

    def run(
        self,
        video_id: str | None,
        creator_notes: str,
        output_thumbnail: str,
        use_ai_thumbnail: bool,
    ) -> dict:
        target_video_id = video_id or self.youtube.get_latest_private_video_id()
        snapshot = self.youtube.get_video_snapshot(target_video_id)

        if self.settings.require_private_video and snapshot.privacy_status != "private":
            raise ValueError(
                f"Video {target_video_id} is '{snapshot.privacy_status}', expected 'private'."
            )

        query = build_search_query(snapshot.title, snapshot.tags)
        competitors = fetch_competitor_videos(
            youtube=self.youtube,
            query=query,
            max_results=self.settings.competitor_results,
        )
        prompt_lines = to_prompt_lines(competitors)

        suggestion = self.llm.generate_metadata(
            video_title=snapshot.title,
            video_description=snapshot.description,
            existing_tags=snapshot.tags,
            notes=creator_notes,
            competitor_lines=prompt_lines,
            max_tags=self.settings.max_tags,
        )

        self.youtube.update_metadata(
            video_id=target_video_id,
            title=suggestion.title,
            description=suggestion.description,
            tags=suggestion.tags,
            category_id=snapshot.category_id,
        )

        thumbnail_path = create_thumbnail(
            topic=suggestion.topic_summary or suggestion.title,
            output_path=output_thumbnail,
            settings=self.settings,
            use_ai=use_ai_thumbnail,
        )
        self.youtube.upload_thumbnail(video_id=target_video_id, image_path=thumbnail_path)

        return {
            "video_id": target_video_id,
            "query": query,
            "competitor_count": len(competitors),
            "new_metadata": asdict(suggestion),
            "thumbnail_path": str(Path(thumbnail_path).resolve()),
        }
