import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import { loadEnv, getCorsOrigins } from "./config/env.js";
import { AuthService } from "./core/auth.service.js";
import { LocationIngestionService } from "./core/location-ingestion.service.js";
import { StatusService } from "./core/status.service.js";
import { VehicleService } from "./core/vehicle.service.js";
import { WsHub } from "./core/ws-hub.js";
import { prisma } from "./db/client.js";
import { registerAuthRoutes } from "./api/routes/auth.js";
import { registerVehicleRoutes } from "./api/routes/vehicles.js";
import { registerGpsRoutes } from "./api/routes/gps.js";
import { registerUserRoutes } from "./api/routes/users.js";
import { TrackerRegistry } from "./trackers/registry.js";
import type { JwtUserPayload } from "./core/auth.service.js";

const env = loadEnv();

const app = Fastify({ logger: true });

const wsHub = new WsHub();
const ingestion = new LocationIngestionService(wsHub, {
  autoRegisterOwntracksPhones: env.AUTO_REGISTER_OWTRACKS_PHONES,
  defaultOrgId: env.DEFAULT_ORG_ID,
  log: app.log,
});
const vehicleService = new VehicleService();
const authService = new AuthService();
const statusService = new StatusService(
  wsHub,
  env.OFFLINE_THRESHOLD_SEC,
  env.STATUS_CHECK_INTERVAL_SEC,
);
const trackerRegistry = new TrackerRegistry(env);

await app.register(cors, {
  origin: getCorsOrigins(env),
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: env.JWT_EXPIRES_IN },
});

await app.register(websocket);

await wsHub.warmVehicleOrgCache(() =>
  prisma.vehicle.findMany({ select: { id: true, organizationId: true } }),
);

app.get("/health", async () => {
  const phoneDeviceCount = await prisma.vehicle.count({
    where: { deviceId: { startsWith: "phone-" } },
  });

  return {
    status: "ok",
    wsClients: wsHub.clientCount,
    owntracksHttp: true,
    autoRegisterOwntracksPhones: env.AUTO_REGISTER_OWTRACKS_PHONES,
    phoneDeviceCount,
  };
});

app.get("/ws", { websocket: true }, (socket, request) => {
  const token = (request.query as { token?: string }).token;
  if (!token) {
    socket.close(4401, "Unauthorized");
    return;
  }

  let payload: JwtUserPayload;
  try {
    payload = app.jwt.verify<JwtUserPayload>(token);
  } catch {
    socket.close(4401, "Unauthorized");
    return;
  }

  // Admin receives all org vehicles; non-admin receives only assigned vehicles.
  void (async () => {
    if (payload.role === "admin") {
      wsHub.add(socket, payload.orgId, null);
      return;
    }
    const rows = await prisma.userVehicle.findMany({
      where: { userId: payload.sub },
      select: { vehicleId: true },
    });
    wsHub.add(socket, payload.orgId, new Set(rows.map((r) => r.vehicleId)));
  })().catch(() => {
    socket.close(1011, "Server error");
  });
});

registerAuthRoutes(app, authService);
registerVehicleRoutes(app, vehicleService, { env, wsHub });
registerUserRoutes(app);
registerGpsRoutes(app, ingestion, env.INGEST_TOKEN);
await trackerRegistry.startAll(app, ingestion, env.INGEST_TOKEN);

statusService.start();

const shutdown = async () => {
  statusService.stop();
  await trackerRegistry.stopAll();
  await app.close();
  await prisma.$disconnect();
};

process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
