import { DateTime } from "luxon";
import { prisma } from "./db";
import { config } from "./config";
import { decryptText } from "./security";
import {
  buildYouTubeClient,
  fetchLatestPrivateVideo,
  fetchVideoSnapshot,
  searchCompetitorsDetailed,
  updateThumbnail,
  updateVideoMetadata
} from "./services/youtubeClient";
import { generateMetadata, generateThumbnail } from "./services/aiService";
import { uploadThumbnailObject } from "./services/storageService";
import { buildCompetitorIntelligence } from "./services/competitorIntelligence";

function buildQuery(title: string, tags: string[]): string {
  const words = `${title} ${tags.join(" ")}`.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const stop = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "what", "when", "why"]);
  const terms = words.filter((w) => w.length > 2 && !stop.has(w)).slice(0, 8);
  return terms.join(" ") || title;
}

async function applyGeneratedMetadata(jobId: string): Promise<void> {
  const job = await prisma.optimizationJob.findUnique({
    where: { id: jobId },
    include: { channel: { include: { oauthCredential: true } } }
  });

  if (!job || !job.channel.oauthCredential) {
    throw new Error("Job or OAuth credential not found");
  }

  const cred = job.channel.oauthCredential;
  const yt = await buildYouTubeClient({
    accessToken: decryptText(cred.encryptedAccessToken),
    refreshToken: cred.encryptedRefreshToken ? decryptText(cred.encryptedRefreshToken) : undefined,
    expiryDate: cred.expiresAt,
    clientId: config.youtubeClientId,
    clientSecret: config.youtubeClientSecret,
    redirectUri: config.youtubeRedirectUri
  });

  if (!job.targetVideoId || !job.generatedTitle || !job.generatedDescription || !job.generatedTags) {
    throw new Error("Generated payload missing on job");
  }

  await updateVideoMetadata(yt, {
    videoId: job.targetVideoId,
    title: job.generatedTitle,
    description: job.generatedDescription,
    tags: Array.isArray(job.generatedTags) ? (job.generatedTags as string[]) : [],
    categoryId: "22"
  });

  if (job.generatedThumbnailUrl) {
    const response = await fetch(job.generatedThumbnailUrl);
    const bytes = Buffer.from(await response.arrayBuffer());
    await updateThumbnail(yt, { videoId: job.targetVideoId, imageBuffer: bytes, mimeType: "image/png" });
  }

  await prisma.auditLog.create({
    data: {
      channelId: job.channelId,
      jobId: job.id,
      action: "metadata_applied",
      oldPayload: {
        title: job.originalTitle,
        description: job.originalDescription,
        tags: job.originalTags
      },
      newPayload: {
        title: job.generatedTitle,
        description: job.generatedDescription,
        tags: job.generatedTags,
        thumbnailUrl: job.generatedThumbnailUrl
      }
    }
  });

  const day = DateTime.utc().toFormat("yyyy-MM-dd");
  const month = DateTime.utc().toFormat("yyyy-MM");
  await prisma.usageRecord.upsert({
    where: { channelId_periodDay: { channelId: job.channelId, periodDay: day } },
    update: { runCount: { increment: 1 }, periodMonth: month },
    create: { channelId: job.channelId, periodDay: day, periodMonth: month, runCount: 1 }
  });

  await prisma.optimizationJob.update({
    where: { id: job.id },
    data: { status: "SUCCEEDED", completedAt: new Date() }
  });
}

export async function runOptimizationJob(jobId: string): Promise<void> {
  const job = await prisma.optimizationJob.findUnique({
    where: { id: jobId },
    include: { channel: { include: { oauthCredential: true } } }
  });

  if (!job || !job.channel.oauthCredential) {
    throw new Error("Job or OAuth credential not found");
  }

  await prisma.optimizationJob.update({ where: { id: job.id }, data: { status: "RUNNING" } });

  try {
    const cred = job.channel.oauthCredential;
    const yt = await buildYouTubeClient({
      accessToken: decryptText(cred.encryptedAccessToken),
      refreshToken: cred.encryptedRefreshToken ? decryptText(cred.encryptedRefreshToken) : undefined,
      expiryDate: cred.expiresAt,
      clientId: config.youtubeClientId,
      clientSecret: config.youtubeClientSecret,
      redirectUri: config.youtubeRedirectUri
    });

    const snapshot = job.targetVideoId ? await fetchVideoSnapshot(yt, job.targetVideoId) : await fetchLatestPrivateVideo(yt);
    const query = buildQuery(snapshot.title, snapshot.tags);
    const competitors = await searchCompetitorsDetailed(yt, query, 15);
    const intelligence = buildCompetitorIntelligence({
      ownTitle: snapshot.title,
      ownDescription: snapshot.description,
      ownTags: snapshot.tags,
      competitors
    });

    const generated = await generateMetadata({
      title: snapshot.title,
      description: snapshot.description,
      tags: snapshot.tags,
      notes: job.notes,
      competitors: competitors.map((c) => `${c.title} | channel: ${c.channelTitle}`),
      keywordGaps: intelligence.keywordGaps,
      nicheClusters: intelligence.clusters.map((cluster) => `${cluster.label}: ${cluster.members.length} videos`),
      engagementInsights: intelligence.topByVelocity.map(
        (c) => `${c.title} | views/day=${Math.round(c.viewVelocity)} | engagement=${(c.engagementRate * 100).toFixed(2)}%`
      )
    });

    const thumbnail = await generateThumbnail(generated.topicSummary || generated.title);
    const key = `${job.channelId}/${job.id}/thumbnail.png`;
    const thumbnailUrl = await uploadThumbnailObject({ key, bytes: thumbnail.bytes, contentType: thumbnail.mimeType });

    await prisma.optimizationJob.update({
      where: { id: job.id },
      data: {
        targetVideoId: snapshot.id,
        originalTitle: snapshot.title,
        originalDescription: snapshot.description,
        originalTags: snapshot.tags,
        generatedTitle: generated.title,
        generatedDescription: generated.description,
        generatedTags: generated.tags,
        generatedTopicSummary: generated.topicSummary,
        generatedThumbnailUrl: thumbnailUrl,
        status: job.channel.approvalMode === "AUTO" ? "RUNNING" : "AWAITING_APPROVAL"
      }
    });

    await prisma.auditLog.create({
      data: {
        channelId: job.channelId,
        jobId: job.id,
        action: "metadata_generated",
        newPayload: {
          query,
          competitors,
          competitorIntelligence: {
            keywordGaps: intelligence.keywordGaps,
            topByVelocity: intelligence.topByVelocity,
            topByEngagement: intelligence.topByEngagement,
            clusters: intelligence.clusters
          },
          title: generated.title,
          description: generated.description,
          tags: generated.tags,
          topicSummary: generated.topicSummary,
          thumbnailUrl
        }
      }
    });

    if (job.channel.approvalMode === "AUTO") {
      await applyGeneratedMetadata(job.id);
    }
  } catch (error) {
    await prisma.optimizationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        failureReason: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date()
      }
    });
    throw error;
  }
}

export async function runApprovalJob(jobId: string): Promise<void> {
  await applyGeneratedMetadata(jobId);
}
