import type { JwtUserPayload } from "./core/auth.service.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}
