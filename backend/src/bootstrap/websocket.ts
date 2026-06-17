import type { FastifyInstance } from "fastify";
import type { JwtUserPayload } from "../core/auth.service.js";
import type { AppContainer } from "../container/types.js";
import { prisma } from "../db/client.js";

export function registerWebSocketRoute(
  app: FastifyInstance,
  container: AppContainer,
): void {
  const { wsHub } = container;
  const path = container.config.websocket.path;

  app.get(path, { websocket: true }, (socket, request) => {
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
}
