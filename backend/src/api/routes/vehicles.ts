import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import type { VehicleService } from "../../core/vehicle.service.js";
import {
  DeviceIdAlreadyExistsError,
  HistoryRangeError,
  OrgVehicleLimitError,
  VehicleNotFoundError,
} from "../../core/vehicle.service.js";
import {
  buildAis140Setup,
  buildOwntracksSetup,
  getPublicTrackerConfig,
} from "../../core/tracker-setup.js";
import type { WsHub } from "../../core/ws-hub.js";
import { getAuthUser, requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

const CreateAis140Schema = z.object({
  trackerType: z.literal("ais140"),
  vehicleName: z.string().min(1).max(100),
  vehicleNumber: z.string().min(1).max(32),
  imei: z.string().regex(/^\d{15}$/, "IMEI must be 15 digits"),
});

const CreateOwntracksSchema = z.object({
  trackerType: z.literal("owntracks_phone"),
  vehicleName: z.string().min(1).max(100),
  vehicleNumber: z.string().min(1).max(32),
  tid: z
    .string()
    .min(1)
    .max(8)
    .regex(/^[A-Za-z0-9]+$/, "Tracker ID must be alphanumeric"),
});

const CreateVehicleSchema = z.discriminatedUnion("trackerType", [
  CreateAis140Schema,
  CreateOwntracksSchema,
]);

function parseHistoryQuery(start?: string, end?: string) {
  if (!start || !end) {
    return { error: "start and end query params required (ISO 8601)" as const };
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: "Invalid date format" as const };
  }

  return { startDate, endDate };
}

export function registerVehicleRoutes(
  app: FastifyInstance,
  vehicleService: VehicleService,
  deps: { env: Env; wsHub: WsHub },
) {
  const auth = { preHandler: requireAuth };
  const adminAuth = { preHandler: [requireAuth, requireRole("admin")] };

  app.get("/api/v1/tracker-setup", auth, async (_request, reply) => {
    return reply.send(getPublicTrackerConfig(deps.env));
  });

  app.post("/api/v1/vehicles", adminAuth, async (request, reply) => {
    const parsed = CreateVehicleSchema.safeParse(request.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0]?.message ?? "Invalid vehicle data";
      return reply.code(400).send({ error: first });
    }

    const user = getAuthUser(request);
    const body = parsed.data;

    try {
      const vehicle = await vehicleService.create(user.orgId, {
        trackerType: body.trackerType,
        vehicleName: body.vehicleName,
        vehicleNumber: body.vehicleNumber,
        imei: body.trackerType === "ais140" ? body.imei : undefined,
        tid: body.trackerType === "owntracks_phone" ? body.tid : undefined,
      });

      deps.wsHub.setVehicleOrg(vehicle.id, user.orgId);

      const setup =
        body.trackerType === "ais140"
          ? buildAis140Setup(
              {
                vehicleNumber: vehicle.vehicleNumber,
                deviceId: vehicle.deviceId,
                imei: body.imei,
              },
              deps.env,
            )
          : buildOwntracksSetup(
              {
                vehicleNumber: vehicle.vehicleNumber,
                deviceId: vehicle.deviceId,
                tid: body.tid,
              },
              deps.env,
            );

      return reply.code(201).send({ vehicle, setup });
    } catch (err) {
      if (err instanceof DeviceIdAlreadyExistsError) {
        return reply.code(409).send({ error: err.message });
      }
      if (err instanceof OrgVehicleLimitError) {
        return reply.code(403).send({ error: err.message });
      }
      if (err instanceof VehicleNotFoundError) {
        return reply.code(404).send({ error: err.message });
      }
      throw err;
    }
  });

  app.get("/api/v1/vehicles", auth, async (request, reply) => {
    const user = getAuthUser(request);
    const vehicles = await vehicleService.findAll(user.orgId);
    return reply.send(vehicles);
  });

  app.get<{ Params: { id: string } }>(
    "/api/v1/vehicles/:id",
    auth,
    async (request, reply) => {
      const user = getAuthUser(request);
      const vehicle = await vehicleService.findById(request.params.id, user.orgId);
      if (!vehicle) return reply.code(404).send({ error: "Vehicle not found" });
      return reply.send(vehicle);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/vehicles/:id/live",
    auth,
    async (request, reply) => {
      const user = getAuthUser(request);
      const live = await vehicleService.getLive(request.params.id, user.orgId);
      if (!live) return reply.code(404).send({ error: "Live state not found" });
      return reply.send(live);
    },
  );

  app.get<{
    Params: { id: string };
    Querystring: { start?: string; end?: string; downsample?: string };
  }>("/api/v1/vehicles/:id/history", auth, async (request, reply) => {
    const parsed = parseHistoryQuery(request.query.start, request.query.end);
    if ("error" in parsed) {
      return reply.code(400).send({ error: parsed.error });
    }

    const user = getAuthUser(request);

    try {
      const history = await vehicleService.getHistory(
        request.params.id,
        user.orgId,
        parsed.startDate,
        parsed.endDate,
        {
          downsample: request.query.downsample
            ? Number.parseInt(request.query.downsample, 10)
            : undefined,
        },
      );
      return reply.send(history);
    } catch (err) {
      if (err instanceof VehicleNotFoundError) {
        return reply.code(404).send({ error: err.message });
      }
      if (err instanceof HistoryRangeError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  });

  app.get<{
    Params: { id: string };
    Querystring: { start?: string; end?: string };
  }>("/api/v1/vehicles/:id/history/summary", auth, async (request, reply) => {
    const parsed = parseHistoryQuery(request.query.start, request.query.end);
    if ("error" in parsed) {
      return reply.code(400).send({ error: parsed.error });
    }

    const user = getAuthUser(request);

    try {
      const summary = await vehicleService.getHistorySummary(
        request.params.id,
        user.orgId,
        parsed.startDate,
        parsed.endDate,
      );
      return reply.send(summary);
    } catch (err) {
      if (err instanceof VehicleNotFoundError) {
        return reply.code(404).send({ error: err.message });
      }
      if (err instanceof HistoryRangeError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  });
}
