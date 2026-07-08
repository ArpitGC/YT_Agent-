import fp from "fastify-plugin";
import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "@fastify/jwt";
import { config } from "./config";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: { id: string; email: string };
  }
}

export const authPlugin = fp(async (app) => {
  app.register(jwt, { secret: config.jwtSecret });

  app.decorate("requireUser", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers["x-user-id"] as string | undefined;
    const email = (request.headers["x-user-email"] as string | undefined) ?? "demo@example.com";

    if (!userId) {
      return reply.unauthorized("Provide x-user-id header for now.");
    }

    request.currentUser = { id: userId, email };
  });
});

declare module "fastify" {
  interface FastifyInstance {
    requireUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
