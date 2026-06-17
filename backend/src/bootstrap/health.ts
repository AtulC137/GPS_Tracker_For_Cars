import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../container/types.js";
import { prisma } from "../db/client.js";

export function registerHealthRoutes(
  app: FastifyInstance,
  container: AppContainer,
): void {
  const { wsHub, env, trackerContainer } = container;

  app.get("/health", async () => {
    const phoneDeviceCount = await prisma.vehicle.count({
      where: { deviceId: { startsWith: "phone-" } },
    });

    return {
      status: "ok",
      wsClients: wsHub.clientCount,
      owntracksHttp: true,
      autoRegisterOwntracksPhones: env.AUTO_REGISTER_OWTRACKS_PHONES,
      phoneDeviceCount,
    };
  });

  app.get("/live", async () => {
    return { status: "ok" };
  });

  app.get("/ready", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      return reply.code(503).send({ status: "not_ready", reason: "database_unreachable" });
    }

    if (!trackerContainer.isInitialized) {
      return reply
        .code(503)
        .send({ status: "not_ready", reason: "trackers_not_initialized" });
    }

    return { status: "ready" };
  });
}
