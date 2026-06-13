import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { loadEnv, getCorsOrigins } from "./config/env.js";
import { LocationIngestionService } from "./core/location-ingestion.service.js";
import { StatusService } from "./core/status.service.js";
import { VehicleService } from "./core/vehicle.service.js";
import { WsHub } from "./core/ws-hub.js";
import { prisma } from "./db/client.js";
import { registerVehicleRoutes } from "./api/routes/vehicles.js";
import { registerGpsRoutes } from "./api/routes/gps.js";
import { TrackerRegistry } from "./trackers/registry.js";

const env = loadEnv();

const app = Fastify({ logger: true });

const wsHub = new WsHub();
const ingestion = new LocationIngestionService(wsHub);
const vehicleService = new VehicleService();
const statusService = new StatusService(
  wsHub,
  env.OFFLINE_THRESHOLD_SEC,
  env.STATUS_CHECK_INTERVAL_SEC,
);
const trackerRegistry = new TrackerRegistry(env);

await app.register(cors, {
  origin: getCorsOrigins(env),
});

await app.register(websocket);

app.get("/health", async () => ({
  status: "ok",
  wsClients: wsHub.clientCount,
}));

app.get("/ws", { websocket: true }, (socket) => {
  wsHub.add(socket);
});

registerVehicleRoutes(app, vehicleService);
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
