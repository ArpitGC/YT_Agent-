from __future__ import annotations

import re
from collections import Counter

from .models import CompetitorVideo
from .youtube_client import YouTubeClient


def _clean_words(text: str) -> list[str]:
    words = re.findall(r"[A-Za-z0-9]+", text.lower())
    stop = {
        "the",
        "and",
        "for",
        "with",
        "this",
        "that",
        "from",
        "your",
        "how",
        "you",
        "video",
        "what",
        "are",
        "why",
        "when",
    }
    return [w for w in words if len(w) > 2 and w not in stop]


def build_search_query(title: str, tags: list[str]) -> str:
    pool = _clean_words(title) + [t.lower() for t in tags[:5]]
    common = [w for w, _ in Counter(pool).most_common(5)]
    return " ".join(common) if common else title


def fetch_competitor_videos(youtube: YouTubeClient, query: str, max_results: int) -> list[CompetitorVideo]:
    rows = youtube.search_top_videos(query=query, max_results=max_results)
    output: list[CompetitorVideo] = []

    for row in rows:
        vid = row.get("id", {}).get("videoId")
        sn = row.get("snippet", {})
        if not vid:
            continue
        output.append(
            CompetitorVideo(
                video_id=vid,
                title=sn.get("title", ""),
                channel_title=sn.get("channelTitle", ""),
                description=sn.get("description", ""),
            )
        )

    return output


def to_prompt_lines(videos: list[CompetitorVideo]) -> list[str]:
    return [f"{v.title} | channel: {v.channel_title}" for v in videos]
