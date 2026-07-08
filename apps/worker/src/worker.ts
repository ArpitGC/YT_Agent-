import { Worker } from "bullmq";
import { JOBS, QUEUES } from "@yt-agent/shared";
import { config } from "./config";
import { runOptimizationJob, runApprovalJob } from "./jobs";

const redisUrl = new URL(config.redisUrl);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379)
};

const worker = new Worker(
  QUEUES.optimization,
  async (job) => {
    if (job.name === JOBS.runOptimization) {
      await runOptimizationJob(String(job.data.jobId));
      return;
    }

    if (job.name === JOBS.applyApproval) {
      await runApprovalJob(String(job.data.jobId));
      return;
    }

    throw new Error(`Unknown job type: ${job.name}`);
  },
  { connection, concurrency: config.workerConcurrency }
);

worker.on("completed", (job) => {
  console.log(`Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job failed: ${job?.id}`, err);
});
