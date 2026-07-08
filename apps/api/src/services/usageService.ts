import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

type QuotaChannel = {
  id: string;
  maxRunsPerDay: number;
  maxRunsPerMonth: number;
};

export async function ensureQuotaAvailable(prisma: PrismaClient, channel: QuotaChannel): Promise<void> {
  const now = DateTime.utc();
  const periodDay = now.toFormat("yyyy-MM-dd");
  const periodMonth = now.toFormat("yyyy-MM");

  const usage = await prisma.usageRecord.upsert({
    where: { channelId_periodDay: { channelId: channel.id, periodDay } },
    update: {},
    create: { channelId: channel.id, periodDay, periodMonth, runCount: 0 }
  });

  if (usage.runCount >= channel.maxRunsPerDay) {
    throw new Error("Daily quota exhausted for this channel");
  }

  const monthCount = await prisma.usageRecord.aggregate({
    where: { channelId: channel.id, periodMonth },
    _sum: { runCount: true }
  });

  const monthlyRuns = monthCount._sum.runCount ?? 0;
  if (monthlyRuns >= channel.maxRunsPerMonth) {
    throw new Error("Monthly quota exhausted for this channel");
  }
}

export async function incrementUsage(prisma: PrismaClient, channelId: string): Promise<void> {
  const now = DateTime.utc();
  const periodDay = now.toFormat("yyyy-MM-dd");
  const periodMonth = now.toFormat("yyyy-MM");

  await prisma.usageRecord.upsert({
    where: { channelId_periodDay: { channelId, periodDay } },
    update: { runCount: { increment: 1 }, periodMonth },
    create: { channelId, periodDay, periodMonth, runCount: 1 }
  });
}
