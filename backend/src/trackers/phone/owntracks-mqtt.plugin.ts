import type { FastifyInstance } from "fastify";
import mqtt, { type MqttClient } from "mqtt";
import { UnknownDeviceError } from "../../core/location-ingestion.service.js";
import type { Env } from "../../config/env.js";
import type { TrackerPlugin, TrackerPluginContext } from "../tracker-plugin.js";
import { owntracksToNormalized } from "./owntracks.adapter.js";

function tidFromPayload(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const tid = (payload as { tid?: unknown }).tid;
  return typeof tid === "string" ? tid : undefined;
}

export function createOwntracksMqttPlugin(env: Env): TrackerPlugin {
  let client: MqttClient | null = null;

  return {
    id: "owntracks-mqtt",

    async start(app: FastifyInstance, ctx: TrackerPluginContext) {
      if (!env.OWTRACKS_MQTT_ENABLED) return;

      client = mqtt.connect(env.MQTT_URL, {
        reconnectPeriod: 5_000,
      });

      client.on("connect", () => {
        app.log.info(`MQTT connected to ${env.MQTT_URL}`);
        client?.subscribe(env.OWTRACKS_MQTT_TOPIC, (err) => {
          if (err) app.log.error({ err }, "MQTT subscribe error");
          else app.log.info(`MQTT subscribed to ${env.OWTRACKS_MQTT_TOPIC}`);
        });
      });

      client.on("message", async (topic, buf) => {
        let payload: unknown | undefined;
        try {
          payload = JSON.parse(buf.toString());
          const normalized = owntracksToNormalized(payload);
          await ctx.ingestion.ingest(normalized);
        } catch (err) {
          if (err instanceof UnknownDeviceError) {
            app.log.warn(
              {
                deviceId: err.deviceId,
                tid: tidFromPayload(payload),
                topic,
                errorType: "unknown_device",
              },
              "OwnTracks MQTT ingest rejected unknown device",
            );
            return;
          }
          app.log.error({ err, topic }, "MQTT message handling error");
        }
      });

      client.on("error", (err) => {
        app.log.error({ err }, "MQTT client error (broker unreachable?)");
      });

      client.on("reconnect", () => {
        app.log.warn("MQTT reconnecting…");
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
