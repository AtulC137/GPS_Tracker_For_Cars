import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config/app-config.js";
import type { LocationIngestionService } from "../core/location-ingestion.service.js";
import { toFlatEnv } from "../config/app-config.js";
import { TrackerRegistry } from "../trackers/registry.js";

export class TrackerContainer {
  readonly registry: TrackerRegistry;

  constructor(config: AppConfig) {
    this.registry = new TrackerRegistry(toFlatEnv(config));
  }

  get isInitialized(): boolean {
    return this.registry.isInitialized;
  }

  get enabledPluginIds(): string[] {
    return this.registry.pluginIds;
  }

  async start(
    app: FastifyInstance,
    ingestion: LocationIngestionService,
    ingestToken?: string,
  ): Promise<void> {
    await this.registry.startAll(app, ingestion, ingestToken);
  }

  async stop(): Promise<void> {
    await this.registry.stopAll();
  }
}

export function createTrackerContainer(config: AppConfig): TrackerContainer {
  return new TrackerContainer(config);
}
