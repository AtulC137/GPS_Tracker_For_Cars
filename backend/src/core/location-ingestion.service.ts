import { prisma } from "../db/client.js";
import type { NormalizedLocationUpdate } from "./types.js";
import { NormalizedLocationUpdateSchema } from "./types.js";
import type { WsHub } from "./ws-hub.js";

export class LocationIngestionService {
  constructor(private wsHub: WsHub) {}

  async ingest(raw: NormalizedLocationUpdate) {
    const update = NormalizedLocationUpdateSchema.parse(raw);

    const vehicle = await prisma.vehicle.findUnique({
      where: { deviceId: update.deviceId },
    });

    if (!vehicle) {
      throw new UnknownDeviceError(update.deviceId);
    }

    const timestamp = new Date(update.timestamp);

    await prisma.$transaction([
      prisma.locationHistory.create({
        data: {
          vehicleId: vehicle.id,
          latitude: update.latitude,
          longitude: update.longitude,
          speed: update.speed ?? null,
          heading: update.heading ?? null,
          timestamp,
          source: update.source,
        },
      }),
      prisma.vehicleLiveState.upsert({
        where: { vehicleId: vehicle.id },
        create: {
          vehicleId: vehicle.id,
          latitude: update.latitude,
          longitude: update.longitude,
          speed: update.speed ?? null,
          heading: update.heading ?? null,
          lastSeenAt: timestamp,
          status: "online",
        },
        update: {
          latitude: update.latitude,
          longitude: update.longitude,
          speed: update.speed ?? null,
          heading: update.heading ?? null,
          lastSeenAt: timestamp,
          status: "online",
        },
      }),
    ]);

    this.wsHub.broadcast({
      type: "vehicle_location_update",
      vehicleId: vehicle.id,
      latitude: update.latitude,
      longitude: update.longitude,
      speed: update.speed ?? null,
      heading: update.heading ?? null,
      lastSeenAt: timestamp.toISOString(),
    });

    return { vehicleId: vehicle.id, accepted: true };
  }
}

export class UnknownDeviceError extends Error {
  constructor(deviceId: string) {
    super(`Unknown deviceId: ${deviceId}`);
    this.name = "UnknownDeviceError";
  }
}
