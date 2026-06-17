import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { UnknownDeviceError, OrgVehicleLimitError } from "../../core/location-ingestion.service.js";
import type { LocationIngestionService } from "../../core/location-ingestion.service.js";
import { GenericGpsPayloadSchema } from "../../core/types.js";
import { createIngestAuth } from "../middleware/ingest-auth.js";

type GpsRouteOptions = {
  ingestToken?: string;
  openTestRoute?: boolean;
};

function createGpsLocationHandler(ingestion: LocationIngestionService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = GenericGpsPayloadSchema.parse(request.body);
      const timestamp = new Date(body.timestamp);
      if (Number.isNaN(timestamp.getTime())) {
        return reply.code(400).send({ error: "Invalid timestamp" });
      }

      await ingestion.ingest({
        deviceId: body.deviceId,
        latitude: body.latitude,
        longitude: body.longitude,
        speed: body.speed ?? null,
        heading: body.heading ?? null,
        timestamp: timestamp.toISOString(),
        source: "generic",
      });

      return reply.code(202).send({ accepted: true });
    } catch (err) {
      if (err instanceof UnknownDeviceError) {
        return reply.code(404).send({ error: err.message });
      }
      if (err instanceof OrgVehicleLimitError) {
        return reply.code(403).send({ error: err.message });
      }
      if (err instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid GPS payload" });
      }
      throw err;
    }
  };
}

export function registerGpsRoutes(
  app: FastifyInstance,
  ingestion: LocationIngestionService,
  options: GpsRouteOptions = {},
) {
  const auth = createIngestAuth(options.ingestToken);
  const handler = createGpsLocationHandler(ingestion);

  app.post("/api/v1/gps/location", { preHandler: auth }, handler);

  if (options.openTestRoute) {
    app.post("/api/v1/test/gps/location", handler);
    app.log.warn(
      "INGEST_OPEN_FOR_TESTING=true — unauthenticated POST /api/v1/test/gps/location is enabled",
    );
  }
}
