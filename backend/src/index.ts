import "dotenv/config";
import { createApp } from "./app.js";
import { createShutdownHandler } from "./bootstrap/shutdown.js";
import { getStartupMetadata, loadAppConfig } from "./config/app-config.js";

const config = loadAppConfig();
const { app, container } = await createApp(config);
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
