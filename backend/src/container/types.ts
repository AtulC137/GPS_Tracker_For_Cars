import type { FastifyBaseLogger } from "fastify";
import type { AppConfig, Env } from "../config/app-config.js";
import type { AuthService } from "../core/auth.service.js";
import type { LocationIngestionService } from "../core/location-ingestion.service.js";
import type { StatusService } from "../core/status.service.js";
import type { VehicleService } from "../core/vehicle.service.js";
import type { WsHub } from "../core/ws-hub.js";
import type { TrackerContainer } from "./tracker-container.js";

export interface AppContainer {
  config: AppConfig;
  env: Env;
  wsHub: WsHub;
  ingestion: LocationIngestionService;
  vehicleService: VehicleService;
  authService: AuthService;
  statusService: StatusService;
  trackerContainer: TrackerContainer;
}

export type CoreServices = Omit<AppContainer, "trackerContainer">;

export type ServiceLogger = Pick<FastifyBaseLogger, "info">;
