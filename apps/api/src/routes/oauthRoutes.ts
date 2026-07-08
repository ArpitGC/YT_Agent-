import { FastifyInstance } from "fastify";
import { google } from "googleapis";
import { prisma } from "../db";
import { buildYoutubeConsentUrl, exchangeCodeForTokens, oauthClient } from "../services/youtubeOAuth";
import { encryptText } from "../security";
import { config } from "../config";

function parseState(state: string): { userId: string; channelId: string } {
  const [userId, channelId] = Buffer.from(state, "base64").toString("utf8").split(":");
  if (!userId || !channelId) {
    throw new Error("Invalid OAuth state");
  }
  return { userId, channelId };
}

export async function oauthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/auth/youtube/connect/start", { preHandler: app.requireUser }, async (request) => {
    const userId = request.currentUser!.id;

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: request.currentUser!.email }
    });

    const channel = await prisma.channel.create({
      data: {
        userId: user.id,
        youtubeChannelId: `pending_${Date.now()}`,
        maxRunsPerDay: config.defaultDailyLimit,
        maxRunsPerMonth: config.defaultMonthlyLimit
      }
    });

    const state = Buffer.from(`${user.id}:${channel.id}`).toString("base64");
    const authUrl = buildYoutubeConsentUrl(state);

    return { authUrl, channelId: channel.id };
  });

  app.get("/auth/youtube/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string };

    if (!query.code || !query.state) {
      return reply.badRequest("Missing code or state");
    }

    const { userId, channelId } = parseState(query.state);
    const tokens = await exchangeCodeForTokens(query.code);

    oauthClient.setCredentials(tokens);
    const yt = google.youtube({ version: "v3", auth: oauthClient });
    const mine = await yt.channels.list({ part: ["id", "snippet"], mine: true });
    const item = mine.data.items?.[0];
    if (!item?.id) {
      return reply.badRequest("Unable to resolve connected YouTube channel");
    }

    const linked = await prisma.channel.findFirst({ where: { id: channelId, userId } });
    if (!linked) {
      return reply.badRequest("Invalid channel for OAuth callback state");
    }

    await prisma.channel.update({
      where: { id: channelId },
      data: {
        youtubeChannelId: item.id,
        title: item.snippet?.title ?? null
      }
    });

    await prisma.oAuthCredential.upsert({
      where: { channelId },
      update: {
        provider: "youtube",
        encryptedAccessToken: encryptText(tokens.access_token ?? ""),
        encryptedRefreshToken: tokens.refresh_token ? encryptText(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope ?? null
      },
      create: {
        channelId,
        provider: "youtube",
        encryptedAccessToken: encryptText(tokens.access_token ?? ""),
        encryptedRefreshToken: tokens.refresh_token ? encryptText(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope ?? null
      }
    });

    await prisma.auditLog.create({
      data: {
        channelId,
        action: "oauth_connected",
        newPayload: { youtubeChannelId: item.id }
      }
    });

    return reply.redirect(config.webUrl);
  });

  app.post("/channels/:channelId/disconnect", { preHandler: app.requireUser }, async (request, reply) => {
    const { channelId } = request.params as { channelId: string };

    const channel = await prisma.channel.findFirst({ where: { id: channelId, userId: request.currentUser!.id } });
    if (!channel) {
      return reply.notFound("Channel not found");
    }

    await prisma.oAuthCredential.deleteMany({ where: { channelId } });
    await prisma.auditLog.create({
      data: {
        channelId,
        action: "oauth_disconnected"
      }
    });

    return { ok: true };
  });
}
