import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function channelRoutes(app: FastifyInstance): Promise<void> {
  app.get("/channels", { preHandler: app.requireUser }, async (request) => {
    return prisma.channel.findMany({ where: { userId: request.currentUser!.id } });
  });

  app.patch("/channels/:channelId/settings", { preHandler: app.requireUser }, async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const body = request.body as {
      approvalMode?: "AUTO" | "REVIEW";
      scheduleEnabled?: boolean;
      scheduleHourLocal?: number;
      scheduleMinuteLocal?: number;
      timezone?: string;
      maxRunsPerDay?: number;
      maxRunsPerMonth?: number;
    };

    const existing = await prisma.channel.findFirst({ where: { id: channelId, userId: request.currentUser!.id } });
    if (!existing) {
      return reply.notFound("Channel not found");
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: {
        approvalMode: body.approvalMode,
        scheduleEnabled: body.scheduleEnabled,
        scheduleHourLocal: body.scheduleHourLocal,
        scheduleMinuteLocal: body.scheduleMinuteLocal,
        timezone: body.timezone,
        maxRunsPerDay: body.maxRunsPerDay,
        maxRunsPerMonth: body.maxRunsPerMonth
      }
    });

    await prisma.auditLog.create({
      data: {
        channelId,
        action: "channel_settings_updated",
        oldPayload: {
          approvalMode: existing.approvalMode,
          scheduleEnabled: existing.scheduleEnabled,
          scheduleHourLocal: existing.scheduleHourLocal,
          scheduleMinuteLocal: existing.scheduleMinuteLocal,
          timezone: existing.timezone,
          maxRunsPerDay: existing.maxRunsPerDay,
          maxRunsPerMonth: existing.maxRunsPerMonth
        },
        newPayload: {
          approvalMode: updated.approvalMode,
          scheduleEnabled: updated.scheduleEnabled,
          scheduleHourLocal: updated.scheduleHourLocal,
          scheduleMinuteLocal: updated.scheduleMinuteLocal,
          timezone: updated.timezone,
          maxRunsPerDay: updated.maxRunsPerDay,
          maxRunsPerMonth: updated.maxRunsPerMonth
        }
      }
    });

    return updated;
  });
}
