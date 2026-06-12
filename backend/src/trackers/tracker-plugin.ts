import type { FastifyInstance } from "fastify";
import type { LocationIngestionService } from "../core/location-ingestion.service.js";

export interface TrackerPluginContext {
  ingestion: LocationIngestionService;
  ingestToken?: string;
}

export interface TrackerPlugin {
  id: string;
  start(app: FastifyInstance, ctx: TrackerPluginContext): Promise<void>;
  stop(): Promise<void>;
}
