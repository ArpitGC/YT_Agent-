import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/billing/profile", { preHandler: app.requireUser }, async (request) => {
    const profile = await prisma.billingProfile.upsert({
      where: { userId: request.currentUser!.id },
      update: {},
      create: { userId: request.currentUser!.id, planCode: "free", status: "active", monthlyRunCap: 150 }
    });

    return profile;
  });

  app.patch("/billing/profile", { preHandler: app.requireUser }, async (request) => {
    const body = request.body as { monthlyRunCap?: number; planCode?: string; status?: string };

    const updated = await prisma.billingProfile.upsert({
      where: { userId: request.currentUser!.id },
      update: {
        monthlyRunCap: body.monthlyRunCap,
        planCode: body.planCode,
        status: body.status
      },
      create: {
        userId: request.currentUser!.id,
        monthlyRunCap: body.monthlyRunCap ?? 150,
        planCode: body.planCode ?? "free",
        status: body.status ?? "active"
      }
    });

    const channels = await prisma.channel.findMany({ where: { userId: request.currentUser!.id } });
    await Promise.all(
      channels.map((channel: { id: string; maxRunsPerMonth: number }) =>
        prisma.channel.update({
          where: { id: channel.id },
          data: { maxRunsPerMonth: Math.min(channel.maxRunsPerMonth, updated.monthlyRunCap) }
        })
      )
    );

    return updated;
  });
}
