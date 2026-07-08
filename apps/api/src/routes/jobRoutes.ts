import { FastifyInstance } from "fastify";
import { JOBS } from "@yt-agent/shared";
import { prisma } from "../db";
import { optimizationQueue } from "../queue";
import { ensureQuotaAvailable } from "../services/usageService";

export async function jobRoutes(app: FastifyInstance): Promise<void> {
  app.post("/jobs", { preHandler: app.requireUser }, async (request, reply) => {
    const body = request.body as { channelId: string; videoId?: string; notes?: string };

    const channel = await prisma.channel.findFirst({ where: { id: body.channelId, userId: request.currentUser!.id } });
    if (!channel) {
      return reply.notFound("Channel not found");
    }

    await ensureQuotaAvailable(prisma, channel);

    const job = await prisma.optimizationJob.create({
      data: {
        userId: request.currentUser!.id,
        channelId: body.channelId,
        status: "QUEUED",
        targetVideoId: body.videoId,
        notes: body.notes,
        triggerSource: "manual"
      }
    });

    await optimizationQueue.add(JOBS.runOptimization, { jobId: job.id });

    return { jobId: job.id, status: job.status };
  });

  app.get("/jobs/:jobId", { preHandler: app.requireUser }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = await prisma.optimizationJob.findFirst({
      where: { id: jobId, userId: request.currentUser!.id }
    });

    if (!job) {
      return reply.notFound("Job not found");
    }

    return job;
  });

  app.post("/jobs/:jobId/approve", { preHandler: app.requireUser }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };

    const job = await prisma.optimizationJob.findFirst({
      where: { id: jobId, userId: request.currentUser!.id }
    });

    if (!job) {
      return reply.notFound("Job not found");
    }

    if (job.status !== "AWAITING_APPROVAL") {
      return reply.badRequest("Job is not awaiting approval");
    }

    await optimizationQueue.add(JOBS.applyApproval, { jobId: job.id });
    return { queued: true };
  });
}
