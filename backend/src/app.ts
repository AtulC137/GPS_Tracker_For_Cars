import Fastify, { type FastifyInstance } from "fastify";
import type { AppConfig } from "./config/app-config.js";
import { registerHealthRoutes } from "./bootstrap/health.js";
import { startBackgroundJobs } from "./bootstrap/jobs.js";
import { registerPlugins } from "./bootstrap/plugins.js";
import { registerRoutes } from "./bootstrap/routes.js";
import { registerWebSocketRoute } from "./bootstrap/websocket.js";
import { createServices } from "./container/services.js";
import { createTrackerContainer } from "./container/tracker-container.js";
import type { AppContainer } from "./container/types.js";

export async function createApp(config: AppConfig): Promise<{
  app: FastifyInstance;
  container: AppContainer;
}> {
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

  return { app, container };
}
