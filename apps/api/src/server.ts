import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { config } from "./config";
import { authPlugin } from "./auth";
import { oauthRoutes } from "./routes/oauthRoutes";
import { channelRoutes } from "./routes/channelRoutes";
import { jobRoutes } from "./routes/jobRoutes";
import { auditRoutes } from "./routes/auditRoutes";
import { billingRoutes } from "./routes/billingRoutes";
import { startScheduler, stopScheduler } from "./services/scheduler";

async function start(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.webUrl, credentials: true });
  await app.register(sensible);
  await app.register(authPlugin);

  app.get("/health", async () => ({ ok: true }));

  await app.register(oauthRoutes);
  await app.register(channelRoutes);
  await app.register(jobRoutes);
  await app.register(auditRoutes);
  await app.register(billingRoutes);

  await app.listen({ port: config.apiPort, host: "0.0.0.0" });
  startScheduler();

  const shutdown = async () => {
    stopScheduler();
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
