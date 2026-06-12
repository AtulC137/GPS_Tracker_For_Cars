import type { FastifyInstance } from "fastify";
import type { TrackerPlugin, TrackerPluginContext } from "../tracker-plugin.js";

/**
 * Stub plugin for future AIS / car hardware trackers.
 * Enable with CAR_SENSOR_ENABLED=true when hardware adapter is ready.
 */
export const carSensorPlugin: TrackerPlugin = {
  id: "car-sensor",

  async start(app: FastifyInstance, _ctx: TrackerPluginContext) {
    app.log.info("Car sensor plugin registered (stub — no routes yet)");
  },

  async stop() {},
};
