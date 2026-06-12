import type { FastifyReply, FastifyRequest } from "fastify";

export function createIngestAuth(ingestToken?: string) {
  return async function ingestAuth(request: FastifyRequest, reply: FastifyReply) {
    if (!ingestToken) return;

    const auth = request.headers.authorization;
    if (!auth) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    if (auth === `Bearer ${ingestToken}`) return;

    const basicPrefix = "Basic ";
    if (auth.startsWith(basicPrefix)) {
      const decoded = Buffer.from(auth.slice(basicPrefix.length), "base64").toString("utf8");
      const [, password] = decoded.split(":");
      if (password === ingestToken) return;
    }

    return reply.code(401).send({ error: "Unauthorized" });
  };
}
