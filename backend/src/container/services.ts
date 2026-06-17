import type { FastifyBaseLogger } from "fastify";
import type { AppConfig } from "../config/app-config.js";
import { toFlatEnv } from "../config/app-config.js";
import { AuthService } from "../core/auth.service.js";
import { LocationIngestionService } from "../core/location-ingestion.service.js";
import { StatusService } from "../core/status.service.js";
import { VehicleService } from "../core/vehicle.service.js";
import { WsHub } from "../core/ws-hub.js";
import type { CoreServices } from "./types.js";

export function createServices(
  config: AppConfig,
  logger: FastifyBaseLogger,
): CoreServices {
  const env = toFlatEnv(config);
  const wsHub = new WsHub();
  const ingestion = new LocationIngestionService(wsHub, {
    autoRegisterOwntracksPhones: config.tracking.autoRegisterOwntracksPhones,
    defaultOrgId: config.tracking.defaultOrgId ?? undefined,
    log: logger,
  });
  const vehicleService = new VehicleService();
  const authService = new AuthService();
  const statusService = new StatusService(
    wsHub,
    config.status.offlineThresholdSec,
    config.status.checkIntervalSec,
  );

  return {
    config,
    env,
    wsHub,
    ingestion,
    vehicleService,
    authService,
    statusService,
  };
}
