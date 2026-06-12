import type { FastifyInstance } from "fastify";
import mqtt, { type MqttClient } from "mqtt";
import { UnknownDeviceError } from "../../core/location-ingestion.service.js";
import type { Env } from "../../config/env.js";
import type { TrackerPlugin, TrackerPluginContext } from "../tracker-plugin.js";
import { owntracksToNormalized } from "./owntracks.adapter.js";

export function createOwntracksMqttPlugin(env: Env): TrackerPlugin {
  let client: MqttClient | null = null;

  return {
    id: "owntracks-mqtt",

    async start(_app: FastifyInstance, ctx: TrackerPluginContext) {
      if (!env.OWTRACKS_MQTT_ENABLED) return;

      client = mqtt.connect(env.MQTT_URL);

      client.on("connect", () => {
        client?.subscribe(env.OWTRACKS_MQTT_TOPIC, (err) => {
          if (err) console.error("MQTT subscribe error:", err);
          else console.log(`MQTT subscribed to ${env.OWTRACKS_MQTT_TOPIC}`);
        });
      });

      client.on("message", async (_topic, buf) => {
        try {
          const payload = JSON.parse(buf.toString());
          const normalized = owntracksToNormalized(payload);
          await ctx.ingestion.ingest(normalized);
        } catch (err) {
          if (err instanceof UnknownDeviceError) {
            console.warn(err.message);
            return;
          }
          console.error("MQTT message handling error:", err);
        }
      });

      client.on("error", (err) => {
        console.error("MQTT client error:", err);
      });
    },

    async stop() {
      if (client) {
        await new Promise<void>((resolve) => {
          client!.end(false, {}, () => resolve());
        });
        client = null;
      }
    },
  };
}
