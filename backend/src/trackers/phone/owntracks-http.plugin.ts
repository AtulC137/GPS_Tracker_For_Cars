import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { UnknownDeviceError } from "../../core/location-ingestion.service.js";
import { createIngestAuth } from "../../api/middleware/ingest-auth.js";
import type { TrackerPlugin, TrackerPluginContext } from "../tracker-plugin.js";
import { owntracksToNormalized } from "./owntracks.adapter.js";

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
            return reply.code(404).send({ error: err.message });
          }
          if (err instanceof ZodError) {
            return reply.code(400).send({ error: "Invalid OwnTracks payload" });
          }
          throw err;
        }
      },
    );
  },

  async stop() {},
};
