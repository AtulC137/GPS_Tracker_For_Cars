import type { FastifyInstance } from "fastify";
import type { Env } from "../config/env.js";
import type { LocationIngestionService } from "../core/location-ingestion.service.js";
import { carSensorPlugin } from "./car/car-sensor.plugin.js";
import { owntracksHttpPlugin } from "./phone/owntracks-http.plugin.js";
import { createOwntracksMqttPlugin } from "./phone/owntracks-mqtt.plugin.js";
import type { TrackerPlugin, TrackerPluginContext } from "./tracker-plugin.js";

export class TrackerRegistry {
  private plugins: TrackerPlugin[] = [];

  constructor(env: Env) {
    this.plugins.push(owntracksHttpPlugin);
    this.plugins.push(createOwntracksMqttPlugin(env));
    if (env.CAR_SENSOR_ENABLED) {
      this.plugins.push(carSensorPlugin);
    }
  }

  async startAll(app: FastifyInstance, ingestion: LocationIngestionService, ingestToken?: string) {
    const ctx: TrackerPluginContext = { ingestion, ingestToken };
    for (const plugin of this.plugins) {
      await plugin.start(app, ctx);
      app.log.info(`Tracker plugin started: ${plugin.id}`);
    }
  }

  async stopAll() {
    for (const plugin of this.plugins) {
      await plugin.stop();
    }
  }
}
