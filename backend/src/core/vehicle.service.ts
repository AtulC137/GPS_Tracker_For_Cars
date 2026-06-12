import type { Vehicle, VehicleLiveState } from "@prisma/client";
import { prisma } from "../db/client.js";
import type { VehicleStatus } from "./types.js";

type VehicleWithLive = Vehicle & { liveState: VehicleLiveState | null };

function toCurrentState(live: VehicleLiveState | null) {
  if (!live) return null;
  return {
    latitude: live.latitude,
    longitude: live.longitude,
    speed: live.speed,
    heading: live.heading,
    lastSeenAt: live.lastSeenAt.toISOString(),
    status: live.status as VehicleStatus,
  };
}

export function formatVehicle(vehicle: VehicleWithLive) {
  return {
    id: vehicle.id,
    vehicleName: vehicle.vehicleName,
    vehicleNumber: vehicle.vehicleNumber,
    deviceId: vehicle.deviceId,
    createdAt: vehicle.createdAt.toISOString(),
    currentState: toCurrentState(vehicle.liveState),
  };
}

export class VehicleService {
  async findAll() {
    const vehicles = await prisma.vehicle.findMany({
      include: { liveState: true },
      orderBy: { vehicleName: "asc" },
    });
    return vehicles.map(formatVehicle);
  }

  async findById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { liveState: true },
    });
    return vehicle ? formatVehicle(vehicle) : null;
  }

  async findByDeviceId(deviceId: string) {
    return prisma.vehicle.findUnique({
      where: { deviceId },
      include: { liveState: true },
    });
  }

  async getLive(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { liveState: true },
    });
    if (!vehicle?.liveState) return null;
    const live = vehicle.liveState;
    return {
      vehicleId: vehicle.id,
      latitude: live.latitude,
      longitude: live.longitude,
      speed: live.speed,
      heading: live.heading,
      lastSeenAt: live.lastSeenAt.toISOString(),
      status: live.status as VehicleStatus,
    };
  }

  async getHistory(id: string, start: Date, end: Date) {
    const points = await prisma.locationHistory.findMany({
      where: {
        vehicleId: id,
        timestamp: { gte: start, lte: end },
      },
      orderBy: { timestamp: "asc" },
    });
    return {
      vehicleId: id,
      points: points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed,
        heading: p.heading,
        timestamp: p.timestamp.toISOString(),
      })),
    };
  }
}
