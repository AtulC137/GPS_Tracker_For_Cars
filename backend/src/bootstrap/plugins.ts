import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config/app-config.js";
import { getCorsOriginsFromConfig } from "../config/app-config.js";

export async function registerPlugins(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  await app.register(cors, {
    origin: getCorsOriginsFromConfig(config),
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(jwt, {
    secret: config.secrets.jwtSecret,
    sign: { expiresIn: config.features.jwtExpiresIn },
  });

  await app.register(websocket);
}
