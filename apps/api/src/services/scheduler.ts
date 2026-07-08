import { DateTime } from "luxon";
import { JOBS } from "@yt-agent/shared";
import { prisma } from "../db";
import { optimizationQueue } from "../queue";

let timer: NodeJS.Timeout | undefined;

function isDueNow(hour: number, minute: number, tz: string): boolean {
  const local = DateTime.now().setZone(tz);
  return local.hour === hour && local.minute === minute;
}

export function startScheduler(): void {
  timer = setInterval(async () => {
    const channels = await prisma.channel.findMany({
      where: { scheduleEnabled: true },
      select: { id: true, userId: true, scheduleHourLocal: true, scheduleMinuteLocal: true, timezone: true }
    });

    for (const channel of channels) {
      if (!isDueNow(channel.scheduleHourLocal, channel.scheduleMinuteLocal, channel.timezone)) {
        continue;
      }

      const existing = await prisma.optimizationJob.findFirst({
        where: {
          channelId: channel.id,
          triggerSource: "scheduler",
          createdAt: { gte: DateTime.utc().startOf("day").toJSDate() }
        }
      });

      if (existing) {
        continue;
      }

      const job = await prisma.optimizationJob.create({
        data: {
          userId: channel.userId,
          channelId: channel.id,
          status: "QUEUED",
          triggerSource: "scheduler"
        }
      });

      await optimizationQueue.add(JOBS.runOptimization, { jobId: job.id });
    }
  }, 60_000);
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
  }
}
