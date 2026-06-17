import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../container/types.js";
import { prisma } from "../db/client.js";

export async function startBackgroundJobs(
  app: FastifyInstance,
  container: AppContainer,
): Promise<void> {
  await container.wsHub.warmVehicleOrgCache(() =>
    prisma.vehicle.findMany({ select: { id: true, organizationId: true } }),
  );

  await container.trackerContainer.start(
    app,
    container.ingestion,
    container.env.INGEST_TOKEN,
  );

  container.statusService.start();
}

export function stopBackgroundJobs(container: AppContainer): void {
  container.statusService.stop();
}
