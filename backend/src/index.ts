import "dotenv/config";
import Fastify from "fastify";
import { registerHealthRoutes } from "./bootstrap/health.js";
import { startBackgroundJobs } from "./bootstrap/jobs.js";
import { registerPlugins } from "./bootstrap/plugins.js";
import { registerRoutes } from "./bootstrap/routes.js";
import { createShutdownHandler } from "./bootstrap/shutdown.js";
import { registerWebSocketRoute } from "./bootstrap/websocket.js";
import { getStartupMetadata, loadAppConfig } from "./config/app-config.js";
import { createServices } from "./container/services.js";
import { createTrackerContainer } from "./container/tracker-container.js";
import type { AppContainer } from "./container/types.js";

const config = loadAppConfig();

const app = Fastify({ logger: true });
const services = createServices(config, app.log);
const trackerContainer = createTrackerContainer(config);
const container: AppContainer = {
  ...services,
  trackerContainer,
};

await registerPlugins(app, config);
registerHealthRoutes(app, container);
registerWebSocketRoute(app, container);
registerRoutes(app, container);
await startBackgroundJobs(app, container);

const shutdown = createShutdownHandler({ app, container, log: app.log });

process.on("SIGINT", () => void shutdown("SIGINT").then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown("SIGTERM").then(() => process.exit(0)));

const meta = getStartupMetadata(config);

try {
  await app.listen({ port: config.server.port, host: config.server.host });
  app.log.info(
    {
      version: meta.version,
      environment: meta.environment,
      port: config.server.port,
      host: config.server.host,
      enabledTrackers: container.trackerContainer.enabledPluginIds,
      databaseHost: meta.databaseHost,
    },
    "GPS Fleet Backend started",
  );
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
