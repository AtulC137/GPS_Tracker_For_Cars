import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "../../core/auth.service.js";
import { getAuthUser } from "./require-auth.js";

export function requireRole(...roles: UserRole[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
    const user = getAuthUser(request);
    if (!roles.includes(user.role)) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  };
}
