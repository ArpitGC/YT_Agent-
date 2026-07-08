import { Queue } from "bullmq";
import { QUEUES } from "@yt-agent/shared";
import { config } from "./config";

const redisUrl = new URL(config.redisUrl);
const connection = {
	host: redisUrl.hostname,
	port: Number(redisUrl.port || 6379)
};

export const optimizationQueue = new Queue(QUEUES.optimization, { connection });
