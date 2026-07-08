from dataclasses import dataclass, field
from typing import List


@dataclass
class VideoSnapshot:
    video_id: str
    title: str
    description: str
    tags: List[str] = field(default_factory=list)
    privacy_status: str = "unknown"
    category_id: str = "22"


@dataclass
class CompetitorVideo:
    video_id: str
    title: str
    channel_title: str
    description: str


@dataclass
class MetadataSuggestion:
    title: str
    description: str
    tags: List[str]
    topic_summary: str
