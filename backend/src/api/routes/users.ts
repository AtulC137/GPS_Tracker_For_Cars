import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { getAuthUser, requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { AuthService } from "../../core/auth.service.js";

const CreateUserSchema = z.object({
  email: z.string().min(3).refine((v) => v.includes("@"), { message: "Invalid email address" }),
  password: z.string().min(8),
  name: z.string().max(100).optional(),
  role: z.enum(["viewer"]).default("viewer"),
  vehicleIds: z.array(z.string()).default([]),
});

const UpdateUserSchema = z.object({
  name: z.string().max(100).optional(),
  role: z.enum(["viewer"]).optional(),
  status: z.enum(["pending", "active", "rejected"]).optional(),
  vehicleIds: z.array(z.string()).optional(),
});

export function registerUserRoutes(app: FastifyInstance) {
  const adminAuth = { preHandler: [requireAuth, requireRole("admin")] };

  app.get("/api/v1/users", adminAuth, async (request, reply) => {
    const authUser = getAuthUser(request);
    const users = await prisma.user.findMany({
      where: { organizationId: authUser.orgId },
      orderBy: { createdAt: "asc" },
      include: { vehicles: { select: { vehicleId: true } } },
    });
    return reply.send(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
        vehicleIds: u.vehicles.map((v) => v.vehicleId),
      })),
    );
  });

  app.post("/api/v1/users", adminAuth, async (request, reply) => {
    const parsed = CreateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0]?.message ?? "Invalid user data";
      return reply.code(400).send({ error: first });
    }

    const authUser = getAuthUser(request);
    const body = parsed.data;

    const email = body.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already exists" });
    }

    const passwordHash = await AuthService.hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: body.name?.trim() || null,
        role: body.role,
        organizationId: authUser.orgId,
        vehicles: {
          create: body.vehicleIds.map((vehicleId) => ({ vehicleId })),
        },
      },
      include: { vehicles: { select: { vehicleId: true } } },
    });

    return reply.code(201).send({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      vehicleIds: user.vehicles.map((v) => v.vehicleId),
    });
  });

  app.patch<{ Params: { id: string } }>(
    "/api/v1/users/:id",
    adminAuth,
    async (request, reply) => {
      const parsed = UpdateUserSchema.safeParse(request.body);
      if (!parsed.success) {
        const first = parsed.error.errors[0]?.message ?? "Invalid user data";
        return reply.code(400).send({ error: first });
      }

      const authUser = getAuthUser(request);
      const id = request.params.id;

      const target = await prisma.user.findFirst({
        where: { id, organizationId: authUser.orgId },
      });
      if (!target) return reply.code(404).send({ error: "User not found" });

      const body = parsed.data;

      if (body.vehicleIds) {
        await prisma.userVehicle.deleteMany({ where: { userId: id } });
        try {
          await prisma.userVehicle.createMany({
            data: body.vehicleIds.map((vehicleId) => ({ userId: id, vehicleId })),
            skipDuplicates: true,
          });
        } catch (err: any) {
          // Unique constraint on vehicleId enforces exclusive assignment.
          if (err?.code === "P2002") {
            return reply
              .code(409)
              .send({ error: "One or more vehicles are already assigned to another user." });
          }
          throw err;
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          name: body.name === undefined ? undefined : body.name.trim() || null,
          role: body.role,
          status: body.status,
        },
        include: { vehicles: { select: { vehicleId: true } } },
      });

      return reply.send({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        vehicleIds: updated.vehicles.map((v) => v.vehicleId),
      });
    },
  );
}

