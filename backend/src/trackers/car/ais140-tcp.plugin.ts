import net from "node:net";
import type { FastifyInstance } from "fastify";
import type { Env } from "../../config/env.js";
import { UnknownDeviceError } from "../../core/location-ingestion.service.js";
import type { TrackerPlugin, TrackerPluginContext } from "../tracker-plugin.js";
import { extractAis140Frames, parseAis140Frame } from "./ais140-mh.adapter.js";

export function createAis140TcpPlugin(env: Env): TrackerPlugin {
  let server: net.Server | null = null;

  return {
    id: "ais140-tcp",

    async start(app: FastifyInstance, ctx: TrackerPluginContext) {
      if (!env.AIS140_TCP_ENABLED) return;

      server = net.createServer((socket) => {
        let buffer = "";
        const remote = `${socket.remoteAddress}:${socket.remotePort}`;

        socket.on("data", (chunk) => {
          buffer += chunk.toString("utf8");
          const { frames, remainder } = extractAis140Frames(buffer);
          buffer = remainder;

          for (const frame of frames) {
            void handleFrame(app, ctx, frame, remote, env.AIS140_VALIDATE_CHECKSUM);
          }
        });

        socket.on("error", (err) => {
          app.log.warn({ err, remote }, "AIS-140 TCP socket error");
        });
      });

      await new Promise<void>((resolve, reject) => {
        server!.listen(env.AIS140_TCP_PORT, env.AIS140_TCP_HOST, () => resolve());
        server!.on("error", reject);
      });

      app.log.info(
        `AIS-140 TCP listener on ${env.AIS140_TCP_HOST}:${env.AIS140_TCP_PORT}`,
      );
    },

    async stop() {
      if (!server) return;
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = null;
    },
  };
}

async function handleFrame(
  app: FastifyInstance,
  ctx: TrackerPluginContext,
  frame: string,
  remote: string,
  validateChecksum: boolean,
) {
  try {
    const parsed = parseAis140Frame(frame, validateChecksum);

    if (parsed.kind === "health") {
      app.log.info(
        { imei: parsed.health?.imei, remote },
        "AIS-140 health packet received",
      );
      return;
    }

    if (parsed.kind === "unknown") {
      app.log.warn({ remote, frame: frame.slice(0, 80) }, "AIS-140 unknown packet type");
      return;
    }

    if (!parsed.update) return;

    await ctx.ingestion.ingest(parsed.update);
    app.log.info(
      { deviceId: parsed.update.deviceId, remote },
      "AIS-140 location ingested",
    );
  } catch (err) {
    if (err instanceof UnknownDeviceError) {
      app.log.warn({ err: err.message, remote }, "AIS-140 unknown device");
      return;
    }
    app.log.warn({ err, remote, frame: frame.slice(0, 80) }, "AIS-140 frame handling error");
  }
}
