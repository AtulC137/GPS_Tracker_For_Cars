import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtUserPayload } from "../../core/auth.service.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify<JwtUserPayload>();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export function getAuthUser(request: FastifyRequest): JwtUserPayload {
  return request.user as JwtUserPayload;
}
