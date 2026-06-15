import { prisma } from "../db/client.js";
import type { NormalizedLocationUpdate } from "./types.js";
import { NormalizedLocationUpdateSchema } from "./types.js";
import type { WsHub } from "./ws-hub.js";

const PHONE_DEVICE_PREFIX = "phone-";

function isOwntracksPhoneDeviceId(deviceId: string): boolean {
  return deviceId.startsWith(PHONE_DEVICE_PREFIX) && deviceId.length > PHONE_DEVICE_PREFIX.length;
}

type IngestionLogger = {
  info: (obj: Record<string, unknown>, msg?: string) => void;
};

export class LocationIngestionService {
  constructor(
    private wsHub: WsHub,
    private options: {
      autoRegisterOwntracksPhones?: boolean;
      defaultOrgId?: string;
      log?: IngestionLogger;
    } = {},
  ) {}

  async ingest(raw: NormalizedLocationUpdate) {
    const update = NormalizedLocationUpdateSchema.parse(raw);

    let vehicle = await prisma.vehicle.findUnique({
      where: { deviceId: update.deviceId },
    });

    if (
      !vehicle &&
      this.options.autoRegisterOwntracksPhones !== false &&
      update.source === "owntracks" &&
      isOwntracksPhoneDeviceId(update.deviceId)
    ) {
      vehicle = await this.autoRegisterOwntracksPhone(update.deviceId);
    }

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

    this.wsHub.setVehicleOrg(vehicle.id, vehicle.organizationId);

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

  private async autoRegisterOwntracksPhone(deviceId: string) {
    const defaultOrgId = this.options.defaultOrgId;
    if (!defaultOrgId) {
      throw new UnknownDeviceError(deviceId);
    }

    const org = await prisma.organization.findUnique({
      where: { id: defaultOrgId },
      include: { _count: { select: { vehicles: true } } },
    });

    if (!org) {
      throw new UnknownDeviceError(deviceId);
    }

    if (org._count.vehicles >= org.maxVehicles) {
      throw new OrgVehicleLimitError(org.id, org.maxVehicles);
    }

    const tid = deviceId.slice(PHONE_DEVICE_PREFIX.length);
    const vehicle = await prisma.vehicle.upsert({
      where: { deviceId },
      update: {},
      create: {
        vehicleName: `Phone ${tid}`,
        vehicleNumber: `PHONE-${tid}`,
        deviceId,
        organizationId: org.id,
        liveState: {
          create: {
            latitude: 0,
            longitude: 0,
            speed: 0,
            heading: 0,
            lastSeenAt: new Date(0),
            status: "offline",
          },
        },
      },
    });

    this.wsHub.setVehicleOrg(vehicle.id, vehicle.organizationId);
    this.options.log?.info({ deviceId, tid, orgId: org.id }, "Auto-registered vehicle for OwnTracks phone");
    return vehicle;
  }
}

export class UnknownDeviceError extends Error {
  readonly deviceId: string;

  constructor(deviceId: string) {
    super(`Unknown deviceId: ${deviceId}`);
    this.name = "UnknownDeviceError";
    this.deviceId = deviceId;
  }
}

export class OrgVehicleLimitError extends Error {
  constructor(
    readonly orgId: string,
    readonly maxVehicles: number,
  ) {
    super(`Organization vehicle limit reached (${maxVehicles})`);
    this.name = "OrgVehicleLimitError";
  }
}
