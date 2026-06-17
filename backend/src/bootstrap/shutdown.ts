import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import type { AppContainer } from "../container/types.js";
import { prisma } from "../db/client.js";
import { stopBackgroundJobs } from "./jobs.js";

export function createShutdownHandler(deps: {
  app: FastifyInstance;
  container: AppContainer;
  log: FastifyBaseLogger;
}): (signal: string) => Promise<void> {
  const { app, container, log } = deps;
  let shuttingDown = false;

  return async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    log.info({ signal }, "Graceful shutdown started");

    stopBackgroundJobs(container);
    await container.trackerContainer.stop();
    container.wsHub.closeAll();
    await app.close();
    await prisma.$disconnect();

    log.info("Graceful shutdown complete");
  };
}
