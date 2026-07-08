from dataclasses import dataclass
import os

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    openai_api_key: str
    openai_model: str = "gpt-4.1-mini"
    max_tags: int = 15
    competitor_results: int = 10
    require_private_video: bool = True

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            max_tags=int(os.getenv("MAX_TAGS", "15")),
            competitor_results=int(os.getenv("COMPETITOR_RESULTS", "10")),
            require_private_video=os.getenv("REQUIRE_PRIVATE_VIDEO", "true").lower() == "true",
        )
