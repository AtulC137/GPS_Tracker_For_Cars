import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AccountNotApprovedError,
  AuthService,
  EmailAlreadyExistsError,
  InvalidInviteCodeError,
} from "../../core/auth.service.js";
import { getAuthUser, requireAuth } from "../middleware/require-auth.js";

const emailSchema = z
  .string()
  .min(3)
  .refine((v) => v.includes("@"), { message: "Invalid email address" });

const LoginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const RegisterBodySchema = z.object({
  inviteCode: z.string().min(2).max(100),
  email: emailSchema,
  password: z.string().min(8),
  name: z.string().max(100).optional(),
});

const UpdateMeBodySchema = z.object({
  name: z.string().max(100).optional(),
});

export function registerAuthRoutes(app: FastifyInstance, authService: AuthService) {
  app.post("/api/v1/auth/login", async (request, reply) => {
    const parsed = LoginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid email or password" });
    }

    let result: Awaited<ReturnType<AuthService["login"]>>;
    try {
      result = await authService.login(parsed.data.email, parsed.data.password);
      if (!result) {
        return reply.code(401).send({ error: "Invalid email or password" });
      }
    } catch (err) {
      if (err instanceof AccountNotApprovedError) {
        return reply.code(403).send({ error: err.message });
      }
      throw err;
    }

    const token = app.jwt.sign(result.payload);
    return reply.send({
      token,
      user: result.user,
      organization: result.organization,
    });
  });

  app.post("/api/v1/auth/register", async (request, reply) => {
    const parsed = RegisterBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0]?.message ?? "Invalid registration data";
      return reply.code(400).send({ error: first });
    }

    try {
      const result = await authService.register(parsed.data);
      return reply.code(201).send({
        user: result.user,
        organization: result.organization,
        status: "pending",
      });
    } catch (err) {
      if (err instanceof EmailAlreadyExistsError) {
        return reply.code(409).send({ error: err.message });
      }
      if (err instanceof InvalidInviteCodeError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  });

  app.get(
    "/api/v1/auth/me",
    { preHandler: requireAuth },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const me = await authService.getMe(authUser.sub);
      if (!me) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      return reply.send(me);
    },
  );

  app.patch(
    "/api/v1/auth/me",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = UpdateMeBodySchema.safeParse(request.body);
      if (!parsed.success) {
        const first = parsed.error.errors[0]?.message ?? "Invalid profile data";
        return reply.code(400).send({ error: first });
      }

      const authUser = getAuthUser(request);
      const me = await authService.updateMe(authUser.sub, parsed.data);
      return reply.send(me);
    },
  );
}
