import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "../api/routes/auth.js";
import { registerGpsRoutes } from "../api/routes/gps.js";
import { registerUserRoutes } from "../api/routes/users.js";
import { registerVehicleRoutes } from "../api/routes/vehicles.js";
import type { AppContainer } from "../container/types.js";

export function registerRoutes(app: FastifyInstance, container: AppContainer): void {
  registerAuthRoutes(app, container.authService);
  registerVehicleRoutes(app, container.vehicleService, {
    env: container.env,
    wsHub: container.wsHub,
  });
  registerUserRoutes(app);
  registerGpsRoutes(app, container.ingestion, {
    ingestToken: container.env.INGEST_TOKEN,
    openTestRoute: container.env.INGEST_OPEN_FOR_TESTING,
  });
}
