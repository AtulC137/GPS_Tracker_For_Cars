import type { FastifyInstance } from "fastify";
import type { Env } from "../config/env.js";
import type { LocationIngestionService } from "../core/location-ingestion.service.js";
import { createAis140TcpPlugin } from "./car/ais140-tcp.plugin.js";
import { owntracksHttpPlugin } from "./phone/owntracks-http.plugin.js";
import { createOwntracksMqttPlugin } from "./phone/owntracks-mqtt.plugin.js";
import type { TrackerPlugin, TrackerPluginContext } from "./tracker-plugin.js";

export class TrackerRegistry {
  private plugins: TrackerPlugin[] = [];
  private initialized = false;

  constructor(env: Env) {
    this.plugins.push(owntracksHttpPlugin);
    this.plugins.push(createOwntracksMqttPlugin(env));
    if (env.AIS140_TCP_ENABLED) {
      this.plugins.push(createAis140TcpPlugin(env));
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get pluginIds(): string[] {
    return this.plugins.map((p) => p.id);
  }

  async startAll(app: FastifyInstance, ingestion: LocationIngestionService, ingestToken?: string) {
    const ctx: TrackerPluginContext = { ingestion, ingestToken };
    for (const plugin of this.plugins) {
      await plugin.start(app, ctx);
      app.log.info(`Tracker plugin started: ${plugin.id}`);
    }
    this.initialized = true;
  }

  async stopAll() {
    for (const plugin of this.plugins) {
      await plugin.stop();
    }
    this.initialized = false;
  }
}
