import { z } from "zod";

export const VehicleStatusSchema = z.enum(["online", "offline"]);
export type VehicleStatus = z.infer<typeof VehicleStatusSchema>;

export const VehicleStateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number().optional().nullable(),
  heading: z.number().optional().nullable(),
  lastSeenAt: z.string(),
  status: VehicleStatusSchema,
});
export type VehicleState = z.infer<typeof VehicleStateSchema>;

export const VehicleSchema = z.object({
  id: z.string(),
  vehicleName: z.string(),
  vehicleNumber: z.string(),
  deviceId: z.string(),
  trackerType: z.enum(["ais140", "owntracks_phone"]).optional(),
  createdAt: z.string().optional(),
  currentState: VehicleStateSchema.nullable().optional(),
});
export type Vehicle = z.infer<typeof VehicleSchema>;

export const LiveStateSchema = z.object({
  vehicleId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number().optional().nullable(),
  heading: z.number().optional().nullable(),
  lastSeenAt: z.string(),
  status: VehicleStatusSchema,
});
export type LiveState = z.infer<typeof LiveStateSchema>;

export const HistoryPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number().optional().nullable(),
  heading: z.number().optional().nullable(),
  timestamp: z.string(),
});
export type HistoryPoint = z.infer<typeof HistoryPointSchema>;

export const HistorySchema = z.object({
  vehicleId: z.string(),
  start: z.string().optional(),
  end: z.string().optional(),
  points: z.array(HistoryPointSchema),
  truncated: z.boolean().optional(),
  totalPointCount: z.number().optional(),
});
export type History = z.infer<typeof HistorySchema>;

export const TripSummarySchema = z.object({
  start: z.string(),
  end: z.string(),
  distanceKm: z.number(),
  durationSec: z.number(),
});
export type TripSummary = z.infer<typeof TripSummarySchema>;

export const RouteSummarySchema = z.object({
  vehicleId: z.string(),
  start: z.string(),
  end: z.string(),
  pointCount: z.number(),
  firstTimestamp: z.string().nullable(),
  lastTimestamp: z.string().nullable(),
  distanceKm: z.number(),
  durationSec: z.number(),
  avgSpeedKmh: z.number().nullable(),
  maxSpeedKmh: z.number().nullable(),
  movingSec: z.number(),
  idleSec: z.number(),
  stopCount: z.number(),
  tripCount: z.number(),
  trips: z.array(TripSummarySchema),
});
export type RouteSummary = z.infer<typeof RouteSummarySchema>;

// WebSocket events
export const LocationUpdateSchema = z.object({
  type: z.literal("vehicle_location_update"),
  vehicleId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number().optional().nullable(),
  heading: z.number().optional().nullable(),
  lastSeenAt: z.string(),
});
export type VehicleLocationUpdate = z.infer<typeof LocationUpdateSchema>;

export const StatusUpdateSchema = z.object({
  type: z.literal("vehicle_status_update"),
  vehicleId: z.string(),
  status: VehicleStatusSchema,
});
export type VehicleStatusUpdate = z.infer<typeof StatusUpdateSchema>;

export const WsEventSchema = z.discriminatedUnion("type", [
  LocationUpdateSchema,
  StatusUpdateSchema,
]);
export type WsEvent = z.infer<typeof WsEventSchema>;

export interface LivePosition {
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  lastSeenAt: string;
  status: VehicleStatus;
}

export const Ais140SetupSchema = z.object({
  trackerType: z.literal("ais140"),
  imei: z.string(),
  vehicleNumber: z.string(),
  deviceId: z.string(),
  tcpHost: z.string(),
  tcpPort: z.number(),
  protocol: z.literal("TCP"),
  note: z.string(),
});

export const OwntracksSetupSchema = z.object({
  trackerType: z.literal("owntracks_phone"),
  tid: z.string(),
  vehicleNumber: z.string(),
  deviceId: z.string(),
  http: z.object({
    mode: z.string(),
    url: z.string(),
    authRequired: z.boolean(),
    authHint: z.string().optional(),
  }),
  mqtt: z.object({
    mode: z.string(),
    host: z.string(),
    port: z.number(),
    topic: z.string(),
    tailscaleNote: z.string(),
  }),
  note: z.string(),
});

export const TrackerSetupSchema = z.union([Ais140SetupSchema, OwntracksSetupSchema]);

export const CreateVehicleResponseSchema = z.object({
  vehicle: VehicleSchema,
  setup: TrackerSetupSchema,
});

export type TrackerSetup = z.infer<typeof TrackerSetupSchema>;
export type CreateVehicleResponse = z.infer<typeof CreateVehicleResponseSchema>;

export type CreateAis140VehicleInput = {
  trackerType: "ais140";
  vehicleName: string;
  vehicleNumber: string;
  imei: string;
};

export type CreateOwntracksVehicleInput = {
  trackerType: "owntracks_phone";
  vehicleName: string;
  vehicleNumber: string;
  tid: string;
};

export type CreateVehicleInput = CreateAis140VehicleInput | CreateOwntracksVehicleInput;