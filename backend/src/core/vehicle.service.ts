import type { Vehicle, VehicleLiveState } from "@prisma/client";

import { prisma } from "../db/client.js";

import type { VehicleStatus } from "./types.js";

import {

  computeRouteStats,

  downsamplePoints,

  MAX_HISTORY_POINTS,

  MAX_SUMMARY_POINTS,

  validateHistoryRange,

} from "./route-analysis.js";

import { deviceIdForTracker, type TrackerType } from "./tracker-setup.js";



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

    trackerType: vehicle.trackerType,

    createdAt: vehicle.createdAt.toISOString(),

    currentState: toCurrentState(vehicle.liveState),

  };

}



function mapHistoryPoint(p: {

  latitude: number;

  longitude: number;

  speed: number | null;

  heading: number | null;

  timestamp: Date;

}) {

  return {

    latitude: p.latitude,

    longitude: p.longitude,

    speed: p.speed,

    heading: p.heading,

    timestamp: p.timestamp.toISOString(),

  };

}



async function assertVehicleInOrg(id: string, organizationId: string) {

  const vehicle = await prisma.vehicle.findFirst({

    where: { id, organizationId },

    include: { liveState: true },

  });

  return vehicle;

}



export class VehicleService {

  async findAll(organizationId: string) {

    const vehicles = await prisma.vehicle.findMany({

      where: { organizationId },

      include: { liveState: true },

      orderBy: { vehicleName: "asc" },

    });

    return vehicles.map(formatVehicle);

  }



  async findById(id: string, organizationId: string) {

    const vehicle = await assertVehicleInOrg(id, organizationId);

    return vehicle ? formatVehicle(vehicle) : null;

  }



  async findByDeviceId(deviceId: string) {

    return prisma.vehicle.findUnique({

      where: { deviceId },

      include: { liveState: true },

    });

  }



  async getLive(id: string, organizationId: string) {

    const vehicle = await assertVehicleInOrg(id, organizationId);

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



  private async fetchHistoryPoints(id: string, organizationId: string, start: Date, end: Date) {

    const vehicle = await assertVehicleInOrg(id, organizationId);

    if (!vehicle) return null;



    return prisma.locationHistory.findMany({

      where: {

        vehicleId: id,

        timestamp: { gte: start, lte: end },

      },

      orderBy: { timestamp: "asc" },

    });

  }



  async getHistory(

    id: string,

    organizationId: string,

    start: Date,

    end: Date,

    options: { downsample?: number } = {},

  ) {

    const rangeError = validateHistoryRange(start, end);

    if (rangeError) {

      throw new HistoryRangeError(rangeError);

    }



    const vehicle = await assertVehicleInOrg(id, organizationId);

    if (!vehicle) {

      throw new VehicleNotFoundError();

    }



    const totalPointCount = await prisma.locationHistory.count({

      where: {

        vehicleId: id,

        timestamp: { gte: start, lte: end },

      },

    });



    const truncated = totalPointCount > MAX_HISTORY_POINTS;

    const rows = await prisma.locationHistory.findMany({

      where: {

        vehicleId: id,

        timestamp: { gte: start, lte: end },

      },

      orderBy: { timestamp: "asc" },

      take: truncated ? MAX_HISTORY_POINTS : undefined,

    });



    let points = rows.map(mapHistoryPoint);



    if (options.downsample && options.downsample > 1) {

      points = downsamplePoints(points, options.downsample);

    }



    return {

      vehicleId: id,

      start: start.toISOString(),

      end: end.toISOString(),

      points,

      ...(truncated ? { truncated: true, totalPointCount } : {}),

    };

  }



  async getHistorySummary(id: string, organizationId: string, start: Date, end: Date) {

    const rangeError = validateHistoryRange(start, end);

    if (rangeError) {

      throw new HistoryRangeError(rangeError);

    }



    const vehicle = await assertVehicleInOrg(id, organizationId);

    if (!vehicle) {

      throw new VehicleNotFoundError();

    }



    const totalPointCount = await prisma.locationHistory.count({

      where: {

        vehicleId: id,

        timestamp: { gte: start, lte: end },

      },

    });



    if (totalPointCount > MAX_SUMMARY_POINTS) {

      throw new HistoryRangeError(

        `Too many points (${totalPointCount}). Narrow the date range.`,

      );

    }



    const rows = await this.fetchHistoryPoints(id, organizationId, start, end);

    if (!rows) {

      throw new VehicleNotFoundError();

    }



    const points = rows.map(mapHistoryPoint);

    const stats = computeRouteStats(points);



    return {

      vehicleId: id,

      start: start.toISOString(),

      end: end.toISOString(),

      ...stats,

    };

  }

  async create(
    organizationId: string,
    input: {
      trackerType: TrackerType;
      vehicleName: string;
      vehicleNumber: string;
      imei?: string;
      tid?: string;
    },
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { _count: { select: { vehicles: true } } },
    });

    if (!org) {
      throw new VehicleNotFoundError();
    }

    if (org._count.vehicles >= org.maxVehicles) {
      throw new OrgVehicleLimitError(org.maxVehicles);
    }

    const deviceId = deviceIdForTracker(input.trackerType, {
      imei: input.imei,
      tid: input.tid,
    });

    const existing = await prisma.vehicle.findUnique({ where: { deviceId } });
    if (existing) {
      throw new DeviceIdAlreadyExistsError(deviceId);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleName: input.vehicleName.trim(),
        vehicleNumber: input.vehicleNumber.trim(),
        deviceId,
        trackerType: input.trackerType,
        organizationId,
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
      include: { liveState: true },
    });

    return formatVehicle(vehicle);
  }

}



export class HistoryRangeError extends Error {

  constructor(message: string) {

    super(message);

    this.name = "HistoryRangeError";

  }

}



export class VehicleNotFoundError extends Error {

  constructor() {

    super("Vehicle not found");

    this.name = "VehicleNotFoundError";

  }

}

export class OrgVehicleLimitError extends Error {
  constructor(public maxVehicles: number) {
    super(`Organization vehicle limit reached (${maxVehicles})`);
    this.name = "OrgVehicleLimitError";
  }
}

export class DeviceIdAlreadyExistsError extends Error {
  constructor(public deviceId: string) {
    super(`Device already registered: ${deviceId}`);
    this.name = "DeviceIdAlreadyExistsError";
  }
}

