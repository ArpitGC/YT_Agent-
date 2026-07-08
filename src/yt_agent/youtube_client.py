from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from .models import VideoSnapshot


SCOPES = ["https://www.googleapis.com/auth/youtube"]


class YouTubeClient:
    def __init__(self, credentials_path: str = "credentials.json", token_path: str = "token.json") -> None:
        self.credentials_path = Path(credentials_path)
        self.token_path = Path(token_path)
        self.service = build("youtube", "v3", credentials=self._load_credentials())

    def _load_credentials(self) -> Credentials:
        creds: Optional[Credentials] = None
        if self.token_path.exists():
            creds = Credentials.from_authorized_user_file(str(self.token_path), SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(str(self.credentials_path), SCOPES)
                creds = flow.run_local_server(port=0)
            self.token_path.write_text(creds.to_json())

        return creds

    def get_video_snapshot(self, video_id: str) -> VideoSnapshot:
        response = (
            self.service.videos()
            .list(part="snippet,status", id=video_id)
            .execute()
        )
        items = response.get("items", [])
        if not items:
            raise ValueError(f"Video not found: {video_id}")

        item = items[0]
        snippet = item.get("snippet", {})
        status = item.get("status", {})

        return VideoSnapshot(
            video_id=video_id,
            title=snippet.get("title", ""),
            description=snippet.get("description", ""),
            tags=snippet.get("tags", []),
            privacy_status=status.get("privacyStatus", "unknown"),
            category_id=snippet.get("categoryId", "22"),
        )

    def get_latest_private_video_id(self) -> str:
        channels = self.service.channels().list(part="contentDetails", mine=True).execute()
        items = channels.get("items", [])
        if not items:
            raise RuntimeError("No channel found for authenticated account.")

        uploads_playlist = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
        playlist_items = (
            self.service.playlistItems()
            .list(part="snippet", playlistId=uploads_playlist, maxResults=15)
            .execute()
            .get("items", [])
        )

        for item in playlist_items:
            candidate_id = item["snippet"]["resourceId"]["videoId"]
            snapshot = self.get_video_snapshot(candidate_id)
            if snapshot.privacy_status == "private":
                return candidate_id

        raise RuntimeError("No private video found in recent uploads.")

    def update_metadata(
        self,
        video_id: str,
        title: str,
        description: str,
        tags: Iterable[str],
        category_id: str,
    ) -> None:
        self.service.videos().update(
            part="snippet",
            body={
                "id": video_id,
                "snippet": {
                    "title": title,
                    "description": description,
                    "tags": list(tags),
                    "categoryId": category_id,
                },
            },
        ).execute()

    def upload_thumbnail(self, video_id: str, image_path: str) -> None:
        media = MediaFileUpload(image_path)
        self.service.thumbnails().set(videoId=video_id, media_body=media).execute()

    def search_top_videos(self, query: str, max_results: int = 10) -> List[dict]:
        response = (
            self.service.search()
            .list(
                part="snippet",
                type="video",
                q=query,
                maxResults=max_results,
                order="viewCount",
            )
            .execute()
        )
        return response.get("items", [])
