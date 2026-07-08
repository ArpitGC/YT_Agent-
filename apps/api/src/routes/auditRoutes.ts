import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get("/audit", { preHandler: app.requireUser }, async (request) => {
    const query = request.query as { channelId?: string; limit?: string };
    const channels = await prisma.channel.findMany({
      where: { userId: request.currentUser!.id },
      select: { id: true }
    });

    const allowedIds = new Set(channels.map((c: { id: string }) => c.id));
    const where = query.channelId && allowedIds.has(query.channelId) ? { channelId: query.channelId } : { channelId: { in: [...allowedIds] } };

    const limit = Math.min(Number(query.limit ?? "50"), 200);
    return prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });
  });

  app.get("/usage", { preHandler: app.requireUser }, async (request) => {
    const channels = await prisma.channel.findMany({ where: { userId: request.currentUser!.id }, select: { id: true, title: true } });

    const usage = await Promise.all(
      channels.map(async (c: { id: string; title: string | null }) => {
        const records = await prisma.usageRecord.findMany({ where: { channelId: c.id }, orderBy: { periodDay: "desc" }, take: 14 });
        return { channelId: c.id, title: c.title, recent: records };
      })
    );

    return usage;
  });
}
