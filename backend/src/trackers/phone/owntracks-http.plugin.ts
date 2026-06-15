import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { UnknownDeviceError, OrgVehicleLimitError } from "../../core/location-ingestion.service.js";
import { createIngestAuth } from "../../api/middleware/ingest-auth.js";
import type { TrackerPlugin, TrackerPluginContext } from "../tracker-plugin.js";
import { owntracksToNormalized } from "./owntracks.adapter.js";

function tidFromDeviceId(deviceId: string): string | undefined {
  if (!deviceId.startsWith("phone-")) return undefined;
  return deviceId.slice("phone-".length);
}

function tidFromPayload(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const tid = (body as { tid?: unknown }).tid;
  return typeof tid === "string" ? tid : undefined;
}

export const owntracksHttpPlugin: TrackerPlugin = {
  id: "owntracks-http",

  async start(app: FastifyInstance, ctx: TrackerPluginContext) {
    const auth = createIngestAuth(ctx.ingestToken);

    app.post(
      "/api/v1/ingest/owntracks",
      { preHandler: auth },
      async (request, reply) => {
        try {
          const normalized = owntracksToNormalized(request.body);
          await ctx.ingestion.ingest(normalized);
          return reply.code(200).type("application/json").send([]);
        } catch (err) {
          if (err instanceof UnknownDeviceError) {
            const tid = tidFromDeviceId(err.deviceId) ?? tidFromPayload(request.body);
            app.log.warn(
              { deviceId: err.deviceId, tid, errorType: "unknown_device" },
              "OwnTracks HTTP ingest rejected unknown device",
            );
            return reply.code(404).send({
              error: err.message,
              hint: "Set OwnTracks tid to match a registered vehicle, enable AUTO_REGISTER_OWTRACKS_PHONES, and set DEFAULT_ORG_ID",
            });
          }
          if (err instanceof OrgVehicleLimitError) {
            return reply.code(403).send({ error: err.message });
          }
          if (err instanceof ZodError) {
            app.log.warn(
              { tid: tidFromPayload(request.body), errorType: "invalid_payload", issues: err.issues },
              "OwnTracks HTTP ingest rejected invalid payload",
            );
            return reply.code(400).send({ error: "Invalid OwnTracks payload" });
          }
          throw err;
        }
      },
    );
  },

  async stop() {},
};
