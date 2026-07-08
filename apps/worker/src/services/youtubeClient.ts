import { google } from "googleapis";

export interface VideoSnapshot {
  id: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: string;
}

export interface CompetitorVideo {
  id: string;
  title: string;
  channelTitle: string;
  description: string;
  publishedAt?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export async function buildYouTubeClient(tokens: {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: Date | null;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const oauth2 = new google.auth.OAuth2(tokens.clientId, tokens.clientSecret, tokens.redirectUri);
  oauth2.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate ? tokens.expiryDate.getTime() : undefined
  });
  return google.youtube({ version: "v3", auth: oauth2 });
}

export async function fetchVideoSnapshot(yt: ReturnType<typeof google.youtube>, videoId: string): Promise<VideoSnapshot> {
  const result = await yt.videos.list({ part: ["snippet", "status"], id: [videoId] });
  const item = result.data.items?.[0];
  if (!item?.id || !item.snippet) {
    throw new Error(`Video not found: ${videoId}`);
  }

  return {
    id: item.id,
    title: item.snippet.title ?? "",
    description: item.snippet.description ?? "",
    tags: item.snippet.tags ?? [],
    categoryId: item.snippet.categoryId ?? "22",
    privacyStatus: item.status?.privacyStatus ?? "unknown"
  };
}

export async function fetchLatestPrivateVideo(yt: ReturnType<typeof google.youtube>): Promise<VideoSnapshot> {
  const channels = await yt.channels.list({ part: ["contentDetails"], mine: true });
  const uploads = channels.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) {
    throw new Error("No uploads playlist found");
  }

  const items = await yt.playlistItems.list({ part: ["snippet"], playlistId: uploads, maxResults: 15 });
  for (const row of items.data.items ?? []) {
    const id = row.snippet?.resourceId?.videoId;
    if (!id) {
      continue;
    }
    const snap = await fetchVideoSnapshot(yt, id);
    if (snap.privacyStatus === "private") {
      return snap;
    }
  }

  throw new Error("No private video found in recent uploads");
}

export async function searchCompetitors(yt: ReturnType<typeof google.youtube>, query: string, maxResults: number): Promise<string[]> {
  const result = await yt.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    order: "viewCount",
    maxResults
  });

  return (result.data.items ?? []).map((item) => {
    const title = item.snippet?.title ?? "";
    const channel = item.snippet?.channelTitle ?? "";
    return `${title} | channel: ${channel}`;
  });
}

export async function searchCompetitorsDetailed(
  yt: ReturnType<typeof google.youtube>,
  query: string,
  maxResults: number
): Promise<CompetitorVideo[]> {
  const search = await yt.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    order: "viewCount",
    maxResults
  });

  const ids = (search.data.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) {
    return [];
  }

  const stats = await yt.videos.list({
    part: ["snippet", "statistics"],
    id: ids
  });

  return (stats.data.items ?? []).map((item) => ({
    id: item.id ?? "",
    title: item.snippet?.title ?? "",
    channelTitle: item.snippet?.channelTitle ?? "",
    description: item.snippet?.description ?? "",
    publishedAt: item.snippet?.publishedAt ?? undefined,
    viewCount: Number(item.statistics?.viewCount ?? 0),
    likeCount: Number(item.statistics?.likeCount ?? 0),
    commentCount: Number(item.statistics?.commentCount ?? 0)
  }));
}

export async function updateVideoMetadata(
  yt: ReturnType<typeof google.youtube>,
  payload: { videoId: string; title: string; description: string; tags: string[]; categoryId: string }
): Promise<void> {
  await yt.videos.update({
    part: ["snippet"],
    requestBody: {
      id: payload.videoId,
      snippet: {
        title: payload.title,
        description: payload.description,
        tags: payload.tags,
        categoryId: payload.categoryId
      }
    }
  });
}

export async function updateThumbnail(
  yt: ReturnType<typeof google.youtube>,
  payload: { videoId: string; imageBuffer: Buffer; mimeType?: string }
): Promise<void> {
  await yt.thumbnails.set({
    videoId: payload.videoId,
    media: {
      body: Buffer.from(payload.imageBuffer),
      mimeType: payload.mimeType ?? "image/jpeg"
    }
  });
}
