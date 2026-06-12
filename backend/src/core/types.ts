import { z } from "zod";

export const LocationSourceSchema = z.enum(["owntracks", "generic", "car_sensor"]);
export type LocationSource = z.infer<typeof LocationSourceSchema>;

export const NormalizedLocationUpdateSchema = z.object({
  deviceId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  timestamp: z.string().min(1),
  source: LocationSourceSchema,
  raw: z.unknown().optional(),
});

export type NormalizedLocationUpdate = z.infer<typeof NormalizedLocationUpdateSchema>;

export const VehicleStatusSchema = z.enum(["online", "offline"]);
export type VehicleStatus = z.infer<typeof VehicleStatusSchema>;

export const GenericGpsPayloadSchema = z.object({
  deviceId: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  timestamp: z.string(),
});

export type GenericGpsPayload = z.infer<typeof GenericGpsPayloadSchema>;
