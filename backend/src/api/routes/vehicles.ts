import type { FastifyInstance } from "fastify";
import type { VehicleService } from "../../core/vehicle.service.js";

export function registerVehicleRoutes(app: FastifyInstance, vehicleService: VehicleService) {
  app.get("/api/v1/vehicles", async (_request, reply) => {
    const vehicles = await vehicleService.findAll();
    return reply.send(vehicles);
  });

  app.get<{ Params: { id: string } }>("/api/v1/vehicles/:id", async (request, reply) => {
    const vehicle = await vehicleService.findById(request.params.id);
    if (!vehicle) return reply.code(404).send({ error: "Vehicle not found" });
    return reply.send(vehicle);
  });

  app.get<{ Params: { id: string } }>("/api/v1/vehicles/:id/live", async (request, reply) => {
    const live = await vehicleService.getLive(request.params.id);
    if (!live) return reply.code(404).send({ error: "Live state not found" });
    return reply.send(live);
  });

  app.get<{
    Params: { id: string };
    Querystring: { start?: string; end?: string };
  }>("/api/v1/vehicles/:id/history", async (request, reply) => {
    const { start, end } = request.query;
    if (!start || !end) {
      return reply.code(400).send({ error: "start and end query params required (ISO 8601)" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return reply.code(400).send({ error: "Invalid date format" });
    }

    const vehicle = await vehicleService.findById(request.params.id);
    if (!vehicle) return reply.code(404).send({ error: "Vehicle not found" });

    const history = await vehicleService.getHistory(request.params.id, startDate, endDate);
    return reply.send(history);
  });
}
