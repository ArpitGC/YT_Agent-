from __future__ import annotations

import argparse
import json

from .config import Settings
from .pipeline import YouTubeOptimizationPipeline
/*added */

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="YouTube optimization agent")
    parser.add_argument(
        "--video-id",
        default=None,
        help="Target video ID. If omitted, latest private upload is used.",
    )
    parser.add_argument(
        "--notes",
        default="",
        help="Optional transcript excerpt or creator notes for richer metadata generation.",
    )
    parser.add_argument(
        "--thumbnail-out",
        default="artifacts/thumbnail.jpg",
        help="Output path for generated thumbnail before upload.",
    )
    parser.add_argument(
        "--ai-thumbnail",
        action="store_true",
        help="Use OpenAI image generation for thumbnail.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = Settings.from_env()
    pipeline = YouTubeOptimizationPipeline(settings=settings)

    result = pipeline.run(
        video_id=args.video_id,
        creator_notes=args.notes,
        output_thumbnail=args.thumbnail_out,
        use_ai_thumbnail=args.ai_thumbnail,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
